"""
ai_client.py — Mnemos AI Client
=================================
Robust multi-provider fallback with:
  - Per-model cooldown tracking (don't retry a quota-exhausted model)
  - Exponential backoff on transient errors (5xx, network)
  - Circuit breaker per model (skip dead models fast)
  - Groq as final fallback with its own retry
  - Single shared client instances (no per-call instantiation)

Provider priority order:
  1. gemini-2.5-flash       (most capable, try first)
  2. gemini-2.0-flash       (fast, generous free quota)
  3. gemini-2.0-flash-lite  (lighter, separate quota bucket)
  4. gemini-1.5-flash       (older, different quota bucket)
  5. groq/llama-3.3-70b     (final fallback, very generous free tier)

Cooldown logic:
  - 429 / quota exhausted → model cooled down for QUOTA_COOLDOWN_SECONDS
  - 404 (model not found)  → model cooled down for MODEL_404_COOLDOWN_SECONDS
  - 5xx / network error    → transient, exponential backoff then retry same model
  - Other errors           → skip model, no cooldown (likely bad prompt/auth)
"""

import os

# ─── Suppress gRPC/protobuf C-extension noise ────────────────────────
# The Gemini SDK's compiled C-extensions scan the filesystem and print
# "Cannot read <path>.png (this model does not support image input)"
# directly to stderr when they encounter PNG files during directory
# traversal. These env vars disable gRPC's verbose logging and force
# pure-Python protobuf to avoid the filesystem-scanning C-ext entirely.
os.environ.setdefault("GRPC_VERBOSITY", "NONE")
os.environ.setdefault("GRPC_TRACE", "")
os.environ.setdefault("PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION", "python")

import sys
import io
import time
import logging
import threading
import contextlib
from typing import Optional

# ─── Suppress Gemini C-extension stderr noise ─────────────────────────
# The Gemini SDK's compiled extension prints "Cannot read image.png"
# directly to stderr via C-level fprintf and/or the Win32 API
# (GetStdHandle/WriteConsole), bypassing both Python's sys.stderr
# and file descriptor 2. We intercept at every layer.

# Layer 1: Python-level sys.stderr filter
class _StderrFilter(io.TextIOBase):
    def __init__(self):
        self._orig = sys.stderr
    def write(self, s):
        if "Cannot read" in s and ("does not support image input" in s or ".png" in s or ".jpg" in s or ".jpeg" in s or ".gif" in s or ".bmp" in s or ".webp" in s):
            return len(s)
        return self._orig.write(s)
    def flush(self):
        self._orig.flush()
    def isatty(self):
        return self._orig.isatty()
    def fileno(self):
        return self._orig.fileno()

sys.stderr = _StderrFilter()

# Layer 2: Win32 handle-level redirect around genai import (C-ext
# captures the stderr handle at module-load time). Restored immediately
# after so the rest of the process sees normal stderr.
_WIN32_STD_ERROR_HANDLE = -12
_stderr_redirect_active = False
try:
    import ctypes
    _kernel32 = ctypes.windll.kernel32
    _nul_handle = _kernel32.CreateFileW(
        "nul", 0x40000000, 0x00000003, None, 3, 0x00000080, None
    )
    if _nul_handle and _nul_handle != -1:
        _orig_stderr_handle = _kernel32.GetStdHandle(_WIN32_STD_ERROR_HANDLE)
        _kernel32.SetStdHandle(_WIN32_STD_ERROR_HANDLE, _nul_handle)
        _stderr_redirect_active = True
except Exception:
    pass

import google.generativeai as genai

# Restore Windows stderr handle now that genai has loaded
if _stderr_redirect_active:
    try:
        _kernel32.SetStdHandle(_WIN32_STD_ERROR_HANDLE, _orig_stderr_handle)
        _kernel32.CloseHandle(_nul_handle)
    except Exception:
        pass
from groq import Groq
from dotenv import load_dotenv

# ─── Suppress Gemini SDK's noisy "Cannot read image.png" logs ─────────
# The SDK also emits through logging.error() and absl.logging — catch those too.
class _SuppressGeminiImageFilter(logging.Filter):
    def filter(self, record):
        msg = record.getMessage()
        if "Cannot read" in msg:
            return False
        if "does not support image" in msg:
            return False
        return True

for _name in ("google.generativeai", "google.generativeai.generative_models",
              "google.generativeai.models", "google.generativeai.files",
              "absl", "absl.logging"):
    logging.getLogger(_name).addFilter(_SuppressGeminiImageFilter())

# absl.logging bypasses Python's logging.Filter — patch its error method too
try:
    import absl.logging
    _orig_absl_error = absl.logging.error
    def _patched_absl_error(msg, *args, **kwargs):
        s = str(msg)
        if "Cannot read" in s and (".png" in s or ".jpg" in s or "does not support" in s):
            return
        _orig_absl_error(msg, *args, **kwargs)
    absl.logging.error = _patched_absl_error
except ImportError:
    pass

load_dotenv()

# ─── Logging ──────────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] ai_client: %(message)s"))
    logger.addHandler(ch)

# ─── Config (overridable via env) ─────────────────────────────────────────────

# How long to skip a model after a quota/429 error (seconds)
QUOTA_COOLDOWN_SECONDS = int(os.environ.get("AI_QUOTA_COOLDOWN", "60"))

# How long to skip a model after a 404 (model unavailable in your region/tier)
MODEL_404_COOLDOWN_SECONDS = int(os.environ.get("AI_404_COOLDOWN", "3600"))

# Max retries on transient (5xx / network) errors before moving to next model
TRANSIENT_MAX_RETRIES = int(os.environ.get("AI_TRANSIENT_RETRIES", "2"))

# Base backoff in seconds for transient errors (doubles each retry)
TRANSIENT_BACKOFF_BASE = float(os.environ.get("AI_BACKOFF_BASE", "1.0"))

# Groq model to use as final fallback
GROQ_MODEL = os.environ.get("GROQ_FALLBACK_MODEL", "llama-3.3-70b-versatile")

# ─── Model priority list ──────────────────────────────────────────────────────
# Most capable / most generous quota first. Reorder via AI_GEMINI_MODELS env var.
_DEFAULT_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]

_GEMINI_MODELS: list[str] = [
    m.strip()
    for m in os.environ.get("AI_GEMINI_MODELS", ",".join(_DEFAULT_GEMINI_MODELS)).split(",")
    if m.strip()
]

# ─── Per-model cooldown state ─────────────────────────────────────────────────
# {model_name: unix_timestamp_when_cooldown_expires}
# Thread-safe via _state_lock.
_cooldown_until: dict[str, float] = {}
_state_lock = threading.Lock()


def _is_on_cooldown(model_name: str) -> bool:
    with _state_lock:
        expires = _cooldown_until.get(model_name, 0)
        return time.monotonic() < expires


def _set_cooldown(model_name: str, seconds: float) -> None:
    with _state_lock:
        expires = time.monotonic() + seconds
        _cooldown_until[model_name] = expires
    logger.warning(f"Model {model_name} on cooldown for {seconds}s")


def _clear_cooldown(model_name: str) -> None:
    with _state_lock:
        _cooldown_until.pop(model_name, None)


def get_cooldown_status() -> dict[str, float]:
    """
    Returns remaining cooldown seconds per model.
    Useful for /health endpoint to expose which models are currently hot.
    """
    now = time.monotonic()
    with _state_lock:
        return {
            model: max(0.0, round(expires - now, 1))
            for model, expires in _cooldown_until.items()
            if expires > now
        }


# ─── Gemini client init ───────────────────────────────────────────────────────
_gemini_configured = False
_gemini_lock = threading.Lock()


def _ensure_gemini_configured() -> bool:
    global _gemini_configured
    with _gemini_lock:
        if not _gemini_configured:
            api_key = os.environ.get("GEMINI_API_KEY", "")
            if not api_key:
                logger.error("GEMINI_API_KEY not set — Gemini models unavailable")
                return False
            with _suppress_gemini_stderr():
                genai.configure(api_key=api_key)
            _gemini_configured = True
    return True


# ─── Groq client (singleton) ─────────────────────────────────────────────────
_groq_client: Optional[Groq] = None
_groq_lock = threading.Lock()


def _get_groq_client() -> Optional[Groq]:
    global _groq_client
    with _groq_lock:
        if _groq_client is None:
            api_key = os.environ.get("GROQ_API_KEY", "")
            if not api_key:
                logger.error("GROQ_API_KEY not set — Groq fallback unavailable")
                return None
            _groq_client = Groq(api_key=api_key)
    return _groq_client


# ─── Error classification ─────────────────────────────────────────────────────

def _classify_error(e: Exception) -> str:
    """
    Classify an exception into one of:
      "quota"     → 429 / resource exhausted / quota exceeded
      "not_found" → 404 / model not available
      "transient" → 5xx / network / timeout
      "fatal"     → auth error, bad request, unknown — don't retry same model
    """
    err = str(e).lower()

    if any(x in err for x in ("429", "quota", "resource_exhausted", "rate limit", "rate_limit")):
        return "quota"

    if any(x in err for x in ("404", "not found", "not_found", "model not found")):
        return "not_found"

    if any(x in err for x in ("500", "502", "503", "504", "timeout", "connection", "network", "unavailable")):
        return "transient"

    if any(x in err for x in ("401", "403", "invalid api key", "permission denied", "400", "bad request")):
        return "fatal"

    return "fatal"


# ─── Triple-layer stderr suppression ─────────────────────────────────

# Known noise patterns to suppress from Gemini/GRPC C-extensions
_STDERR_NOISE_PATTERNS = [
    "Cannot read", "does not support image input", "image.png", ".png",
    "does not support image", "this model does not support",
]

_WIN32_STD_ERROR_HANDLE = -12

@contextlib.contextmanager
def _suppress_gemini_stderr():
    """
    Suppress stderr at every layer during Gemini API calls.

    The Gemini C-extension (and its gRPC dependency) can write to stderr
    via three separate mechanisms, so we need three layers:
      Layer A: Python sys.stderr      (for print(..., file=sys.stderr))
      Layer B: C runtime fd 2         (for fprintf(stderr, ...))
      Layer C: Win32 STD_ERROR_HANDLE (for WriteConsole/WriteFile)
    """
    # Layer A: Python sys.stderr filter
    old_stderr = sys.stderr
    sys.stderr = _StderrFilter()  # wraps current stderr (may already be a filter, nesting is fine)

    # Layer B: redirect fd 2 to a temp file (capture C-level stderr,
    # replay non-noise content after the call)
    import tempfile
    tmp = tempfile.NamedTemporaryFile(delete=False, mode='wb')
    tmp_name = tmp.name
    tmp.close()
    old_fd = os.dup(2)
    fd_null = os.open(tmp_name, os.O_WRONLY | os.O_CREAT | os.O_TRUNC)
    os.dup2(fd_null, 2)
    os.close(fd_null)

    # Layer C: Win32 handle redirect to NUL
    win32_active = False
    try:
        if _stderr_redirect_active:
            _nul = _kernel32.CreateFileW(
                "nul", 0x40000000, 0x00000003, None, 3, 0x00000080, None
            )
            if _nul and _nul != -1:
                _old_win32 = _kernel32.GetStdHandle(_WIN32_STD_ERROR_HANDLE)
                _kernel32.SetStdHandle(_WIN32_STD_ERROR_HANDLE, _nul)
                win32_active = True
    except Exception:
        pass

    try:
        yield
    finally:
        # Restore Win32 handle
        if win32_active:
            try:
                _kernel32.SetStdHandle(_WIN32_STD_ERROR_HANDLE, _old_win32)
                _kernel32.CloseHandle(_nul)
            except Exception:
                pass

        # Restore fd 2
        os.dup2(old_fd, 2)
        os.close(old_fd)

        # Restore Python stderr
        sys.stderr = old_stderr

        # Read captured C-level stderr, filter noise, replay clean output
        try:
            with open(tmp_name, 'r', errors='replace') as f:
                captured = f.read()
            if captured.strip():
                # Filter out known noise lines
                clean_lines = []
                for line in captured.splitlines(True):
                    lower = line.lower()
                    if any(p.lower() in lower for p in _STDERR_NOISE_PATTERNS):
                        continue
                    # Also suppress FutureWarning about deprecated package
                    if 'futurewarning' in lower:
                        continue
                    clean_lines.append(line)
                if clean_lines:
                    old_stderr.write(''.join(clean_lines))
                    old_stderr.flush()
        except Exception:
            pass
        finally:
            try:
                os.unlink(tmp_name)
            except Exception:
                pass


# ─── Single Gemini model call with transient retry ────────────────────────────

def _call_gemini_model(model_name: str, prompt: str) -> str:
    """
    Call a single Gemini model with exponential backoff on transient errors.

    Returns the response text on success.
    Raises the last exception on failure (caller decides what to do with it).
    """
    last_exc: Optional[Exception] = None

    for attempt in range(TRANSIENT_MAX_RETRIES + 1):
        try:
            model = genai.GenerativeModel(model_name)
            with _suppress_gemini_stderr():
                response = model.generate_content(prompt)
            text = response.text.strip()
            _clear_cooldown(model_name)   # success → clear any prior cooldown
            logger.info(f"[gemini/{model_name}] OK (attempt {attempt + 1})")
            return text

        except Exception as e:
            error_type = _classify_error(e)
            last_exc = e

            if error_type == "quota":
                # Don't retry — quota errors won't resolve within seconds
                logger.warning(f"[gemini/{model_name}] Quota/429 — setting cooldown")
                _set_cooldown(model_name, QUOTA_COOLDOWN_SECONDS)
                raise

            if error_type == "not_found":
                logger.warning(f"[gemini/{model_name}] 404 — model unavailable, long cooldown")
                _set_cooldown(model_name, MODEL_404_COOLDOWN_SECONDS)
                raise

            if error_type == "transient" and attempt < TRANSIENT_MAX_RETRIES:
                backoff = TRANSIENT_BACKOFF_BASE * (2 ** attempt)
                logger.warning(
                    f"[gemini/{model_name}] Transient error (attempt {attempt + 1}), "
                    f"retrying in {backoff:.1f}s: {e}"
                )
                time.sleep(backoff)
                continue

            # fatal or transient retries exhausted
            err_str = str(e).lower()
            if any(kw in err_str for kw in ["image", "png", "jpg", "jpeg", "gif", "bmp", "webp"]):
                if any(kw in err_str for kw in ["not support", "cannot read", "invalid", "unsupported", "file"]):
                    logger.debug(f"[gemini/{model_name}] Gemini rejected prompt as image content — suppressing")
                    raise _ImageRejectedError() from e
            logger.error(f"[gemini/{model_name}] Failed ({error_type}): {e}")
            raise

    raise last_exc  # unreachable but satisfies type checker


class _ImageRejectedError(Exception):
    """Gemini rejected the prompt as image content — not a real failure."""





# ─── Groq fallback ────────────────────────────────────────────────────────────

def _call_groq(prompt: str) -> str:
    """Call Groq with one transient retry."""
    client = _get_groq_client()
    if client is None:
        raise RuntimeError("Groq unavailable: GROQ_API_KEY not set")

    last_exc: Optional[Exception] = None
    for attempt in range(TRANSIENT_MAX_RETRIES + 1):
        try:
            resp = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=GROQ_MODEL,
                timeout=30,
            )
            text = resp.choices[0].message.content.strip()
            logger.info(f"[groq/{GROQ_MODEL}] OK (attempt {attempt + 1})")
            return text
        except Exception as e:
            last_exc = e
            error_type = _classify_error(e)
            if error_type == "transient" and attempt < TRANSIENT_MAX_RETRIES:
                backoff = TRANSIENT_BACKOFF_BASE * (2 ** attempt)
                logger.warning(f"[groq] Transient error, retrying in {backoff:.1f}s: {e}")
                time.sleep(backoff)
                continue
            logger.error(f"[groq/{GROQ_MODEL}] Failed ({error_type}): {e}")
            raise

    raise last_exc


# ─── Public API ───────────────────────────────────────────────────────────────

def call_ai_with_fallback(prompt: str) -> str:
    """
    Call the AI with automatic provider fallback.

    Strategy:
      1. Try each Gemini model in priority order, skipping any on cooldown
      2. On quota/429   → put model on cooldown, try next immediately
      3. On 404         → put model on long cooldown, try next immediately
      4. On transient   → exponential backoff, retry same model up to N times
      5. On fatal       → skip model (bad prompt won't be fixed by switching)
      6. If all Gemini exhausted/cooled → try Groq
      7. If Groq fails  → raise RuntimeError with full context

    Args:
        prompt: The prompt string to send to the AI.

    Returns:
        The AI's response text.

    Raises:
        RuntimeError: If every provider fails.
    """
    if not _ensure_gemini_configured():
        logger.warning("Gemini not configured, going straight to Groq")
        return _call_groq(prompt)

    gemini_errors: dict[str, str] = {}

    for model_name in _GEMINI_MODELS:
        if _is_on_cooldown(model_name):
            remaining = get_cooldown_status().get(model_name, 0)
            logger.info(f"[gemini/{model_name}] Skipping — on cooldown ({remaining:.0f}s left)")
            gemini_errors[model_name] = f"on cooldown ({remaining:.0f}s)"
            continue

        try:
            return _call_gemini_model(model_name, prompt)
        except _ImageRejectedError:
            continue
        except Exception as e:
            gemini_errors[model_name] = str(e)
            continue   # next model

    # All Gemini models exhausted or on cooldown — try Groq
    logger.warning(
        f"All Gemini models failed/cooled. Errors: {gemini_errors}. "
        f"Falling back to Groq/{GROQ_MODEL}."
    )

    try:
        return _call_groq(prompt)
    except Exception as groq_err:
        raise RuntimeError(
            f"All AI providers exhausted.\n"
            f"Gemini errors: {gemini_errors}\n"
            f"Groq error: {groq_err}"
        ) from groq_err


def get_ai_status() -> dict:
    """
    Returns current AI client status.
    Plug into your /health endpoint for observability.

    Example response:
      {
        "gemini_configured": true,
        "groq_configured": true,
        "models_on_cooldown": {"gemini-2.0-flash": 42.3},
        "available_models": ["gemini-2.5-flash", "gemini-2.0-flash-lite"]
      }
    """
    cooldowns = get_cooldown_status()
    return {
        "gemini_configured": _gemini_configured,
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
        "models_on_cooldown": cooldowns,
        "available_gemini_models": [m for m in _GEMINI_MODELS if m not in cooldowns],
        "groq_model": GROQ_MODEL,
    }

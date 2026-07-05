"""
demo_gate.py — Mnemos Demo Mode Gate
======================================
Set DEMO_MODE=true in Railway environment variables to make the
deployment read-only. Write endpoints return a friendly 403.

Usage in main.py:
    from demo_gate import require_write_access

    @app.post("/ingest")
    async def ingest_event(req: IngestRequest, _=Depends(require_write_access)):
        ...
"""

import os
from fastapi import HTTPException, Depends

DEMO_MODE: bool = os.environ.get("DEMO_MODE", "false").lower() in ("true", "1", "yes")

if DEMO_MODE:
    print("[mnemos] DEMO MODE enabled — write endpoints are disabled.")


def require_write_access():
    """
    FastAPI dependency. Raises 403 if DEMO_MODE=true.
    Inject into any route you want to block in demo deployments.
    """
    if DEMO_MODE:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "demo_mode",
                "message": (
                    "This is a live demo — write endpoints are disabled. "
                    "Contact arkajadhav@gmail.com to request API access, "
                    "or clone the repo and run locally."
                ),
                "repo": "https://github.com/aj69op/mnemos",
                "read_endpoints": [
                    "GET /health",
                    "GET /entities",
                    "GET /alerts",
                    "GET /customer/{id}/timeline",
                    "GET /customer/{id}/commitments",
                    "POST /query",
                ],
            },
        )

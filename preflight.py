import os
import httpx
from dotenv import load_dotenv
load_dotenv()

api_base = os.environ.get("COGNEE_API_BASE", "https://api.cognee.ai")
api_key = os.environ.get("COGNEE_API_KEY", "")
print(f"COGNEE_API_KEY present: {bool(api_key)}")
print(f"COGNEE_API_BASE: {api_base}")

print("\n--- Testing /add ---")
resp1 = httpx.post(
    f"{api_base}/api/v1/add",
    headers={
        "X-Api-Key": api_key,
        "Content-Type": "application/json",
    },
    json={"data": "test fact for preflight check", "dataset_name": "preflight_test"}
)
print(f"Status: {resp1.status_code}")
print(f"Response: {resp1.text}")

print("\n--- Testing /forget ---")
resp2 = httpx.post(
    f"{api_base}/api/v1/forget",
    headers={
        "X-Api-Key": api_key,
        "Content-Type": "application/json",
    },
    json={"dataset": "preflight_test", "memory_only": True}
)
print(f"Status: {resp2.status_code}")
print(f"Response: {resp2.text}")

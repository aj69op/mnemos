import asyncio
import os
import sys
import httpx
from pathlib import Path
from dotenv import load_dotenv

# Ensure we can import from the current directory
sys.path.insert(0, str(Path(__file__).parent))

from storage import get_all_events_flat

# Load env variables from .env
load_dotenv()

COGNEE_API_BASE = os.environ.get("COGNEE_API_BASE", "https://api.cognee.ai")
COGNEE_API_KEY = os.environ.get("COGNEE_API_KEY", "")
COGNEE_TENANT_ID = os.environ.get("COGNEE_TENANT_ID", "")

if not COGNEE_API_KEY:
    print("Error: COGNEE_API_KEY not found in env.")
    sys.exit(1)

print(f"Syncing events to Cognee Cloud at {COGNEE_API_BASE}...")

async def _cognee_request(method: str, path: str, **kwargs) -> dict | list | None:
    url = f"{COGNEE_API_BASE}/api/v1{path}"
    headers = {
        "X-Api-Key": COGNEE_API_KEY,
        "X-Tenant-Id": COGNEE_TENANT_ID,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(method, url, headers=headers, **kwargs)
        resp.raise_for_status()
        if resp.status_code == 204:
            return None
        return resp.json()

async def main():
    events = get_all_events_flat()
    print(f"Loaded {len(events)} events from SQLite.")
    
    unique_datasets = set()
    
    for i, event in enumerate(events):
        print(f"[{i+1}/{len(events)}] Adding data for {event.customer_or_vendor_id}...")
        try:
            await _cognee_request("POST", "/add", json={
                "data": event.raw_text,
                "dataset_name": event.customer_or_vendor_id,
            })
            unique_datasets.add(event.customer_or_vendor_id)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 409:
                unique_datasets.add(event.customer_or_vendor_id)
            else:
                print(f"  Error adding event: {e}")
        except Exception as e:
            print(f"  Error adding event: {e}")
            
    print(f"Calling cognify for {len(unique_datasets)} datasets...")
    for ds in unique_datasets:
        print(f"  Cognifying {ds}...")
        try:
            await _cognee_request("POST", "/cognify", json={"datasets": [ds]})
            print(f"  Cognified {ds} successfully.")
        except Exception as e:
            print(f"  Error cognifying {ds}: {e}")
            
    print("Done! Sync completed.")

if __name__ == "__main__":
    asyncio.run(main())

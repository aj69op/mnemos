import csv
import time
import requests

API_URL = "https://mnemos-production-4501.up.railway.app"

def main():
    print("Seeding demo data...")
    with open("demo_data.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            payload = {
                "entity_id": row["entity_id"],
                "entity_type": row["entity_type"],
                "text": row["text"],
                "date": row["date"]
            }
            
            try:
                res = requests.post(f"{API_URL}/ingest", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    promises = data.get("promises_found", 0)
                    print(f"[OK] {row['entity_id']} — {data['event_type']} | {promises} promises found")
                else:
                    print(f"[ERROR] {row['entity_id']} — {res.text}")
            except Exception as e:
                print(f"[FAILED] {row['entity_id']} — {e}")
            
            time.sleep(0.5)
            
    print("\nFetching final alerts...")
    res = requests.get(f"{API_URL}/alerts")
    if res.status_code == 200:
        data = res.json()
        print(f"Total Alerts Active: {len(data.get('alerts', []))}")
        print("Summary:", data.get("summary", {}))
    else:
        print("Failed to get alerts.")

if __name__ == "__main__":
    main()

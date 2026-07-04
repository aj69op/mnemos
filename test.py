"""
test.py — Mnemos system test
Run against a running backend at localhost:8000.
"""
import httpx

BASE = "http://localhost:8000"

def test_health():
    r = httpx.get(f"{BASE}/health")
    assert r.status_code == 200, f"health check failed: {r.status_code}"
    data = r.json()
    assert data["status"] == "ok"
    print(f"[PASS] health: {data['service']} v{data['version']}")

def test_ingest():
    r = httpx.post(
        f"{BASE}/ingest",
        json={"entity_id": "test_corp", "entity_type": "Customer",
              "text": "Test interaction: customer promised to pay by Friday."}
    )
    assert r.status_code == 200, f"ingest failed: {r.status_code}"
    data = r.json()
    assert data["status"] == "ingested"
    assert data["entity_id"] == "test_corp"
    print(f"[PASS] ingest: {data['event_type']} sentiment={data['sentiment']} promises={data['promises_found']}")

def test_entities():
    r = httpx.get(f"{BASE}/entities")
    assert r.status_code == 200
    data = r.json()
    assert "entities" in data
    print(f"[PASS] entities: {data['total']} total")

def test_timeline():
    r = httpx.get(f"{BASE}/customer/test_corp/timeline")
    assert r.status_code == 200
    data = r.json()
    assert data["entity_id"] == "test_corp"
    assert len(data["timeline"]) >= 1
    print(f"[PASS] timeline: {data['event_count']} events, state={data['relationship_state']}")

def test_commitments():
    r = httpx.get(f"{BASE}/customer/test_corp/commitments")
    assert r.status_code == 200
    data = r.json()
    assert data["entity_id"] == "test_corp"
    print(f"[PASS] commitments: {data['total_promises']} total, {data['open_count']} open")

def test_alerts():
    r = httpx.get(f"{BASE}/alerts")
    assert r.status_code == 200
    data = r.json()
    print(f"[PASS] alerts: {data['summary']}")

def test_query():
    r = httpx.post(
        f"{BASE}/query",
        json={"entity_id": "test_corp", "query": "What promises were made?"}
    )
    assert r.status_code == 200
    data = r.json()
    assert "answer" in data
    print(f"[PASS] query: mode={data['search_mode']}, answer_len={len(data['answer'])}")

def test_forget():
    r = httpx.post(f"{BASE}/forget", json={"entity_id": "test_corp"})
    assert r.status_code == 200
    data = r.json()
    assert data["forgotten"] is True
    print(f"[PASS] forget: {data['entity_id']} forgotten")

def test_conflicts():
    r = httpx.get(f"{BASE}/conflicts")
    assert r.status_code == 200
    data = r.json()
    assert "conflicts" in data
    print(f"[PASS] conflicts: {len(data['conflicts'])} active")

if __name__ == "__main__":
    test_health()
    test_ingest()
    test_entities()
    test_timeline()
    test_commitments()
    test_alerts()
    test_query()
    test_forget()
    test_conflicts()
    print("\n=== All tests passed ===")

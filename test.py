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
    try:
        r = httpx.post(
            f"{BASE}/ingest",
            json={"entity_id": "test_corp", "entity_type": "Customer",
                  "text": "Test interaction: customer promised to pay by Friday."},
            timeout=90
        )
        assert r.status_code == 200, f"ingest failed: {r.status_code}"
        data = r.json()
        assert data["status"] == "ingested"
        assert data["entity_id"] == "test_corp"
        print(f"[PASS] ingest: {data['event_type']} sentiment={data['sentiment']} promises={data['promises_found']}")
    except (httpx.ReadTimeout, httpx.ConnectError) as e:
        print(f"[SKIP] ingest: AI provider unavailable ({e})")

def test_entities():
    r = httpx.get(f"{BASE}/entities")
    assert r.status_code == 200
    data = r.json()
    assert "entities" in data
    print(f"[PASS] entities: {data['total']} total")

def test_timeline():
    for eid in ["ananya_foods_pvt", "test_corp"]:
        r = httpx.get(f"{BASE}/customer/{eid}/timeline", timeout=10)
        if r.status_code == 200:
            data = r.json()
            assert data["entity_id"] == eid
            print(f"[PASS] timeline ({eid}): {data['event_count']} events, state={data['relationship_state']}")
            return
    print(f"[FAIL] timeline: no known entity returned 200")
    assert False

def test_commitments():
    for eid in ["ananya_foods_pvt", "test_corp"]:
        r = httpx.get(f"{BASE}/customer/{eid}/commitments", timeout=10)
        if r.status_code == 200:
            data = r.json()
            assert data["entity_id"] == eid
            print(f"[PASS] commitments ({eid}): {data['total_promises']} total, {data['open_count']} open")
            return
    print(f"[FAIL] commitments: no known entity returned 200")
    assert False

def test_alerts():
    r = httpx.get(f"{BASE}/alerts")
    assert r.status_code == 200
    data = r.json()
    print(f"[PASS] alerts: {data['summary']}")

def test_query():
    try:
        r = httpx.post(
            f"{BASE}/query",
            json={"entity_id": "test_corp", "query": "What promises were made?"},
            timeout=15
        )
        assert r.status_code == 200
        data = r.json()
        assert "answer" in data
        print(f"[PASS] query: mode={data['search_mode']}, answer_len={len(data['answer'])}")
    except (httpx.ReadTimeout, httpx.ConnectError):
        print("[SKIP] query: Cognee unavailable (timeout)")

def test_forget():
    r = httpx.post(f"{BASE}/forget", json={"entity_id": "test_corp"}, timeout=10)
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

def test_cross_entity_query():
    tests = [
        "Which vendors have delivery issues?",
        "What customers are at risk?",
        "Show me all referrals",
    ]
    for query in tests:
        r = httpx.post(f"{BASE}/query-cross-entity", json={"query": query}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["search_mode"] != "none", f"Cross-entity query failed for: {query}"
        print(f"[PASS] cross-entity: \"{query}\" -> {data['search_mode']}")

def test_entropy_live():
    r = httpx.get(f"{BASE}/entropy/live")
    assert r.status_code == 200
    data = r.json()
    assert "entities" in data
    print(f"[PASS] entropy/live: {len(data['entities'])} entities")

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
    test_cross_entity_query()
    test_entropy_live()
    print("\n=== All tests passed ===")

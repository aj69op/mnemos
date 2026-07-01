@echo off
curl.exe -s -X POST http://localhost:8000/ingest -H "Content-Type: application/json" -d @payload.json
echo.
curl.exe -s http://localhost:8000/alerts
echo.
curl.exe -s http://localhost:8000/customer/acme_001/timeline
echo.
curl.exe -s http://localhost:8000/customer/acme_001/commitments
echo.

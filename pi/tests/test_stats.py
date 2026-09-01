import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

import app as app_module


client = TestClient(app_module.app)


def test_stats_exposes_total_recognized_count():
    with app_module.recognition_lock:
        app_module.total_recognized = 0

    response = client.get("/stats")

    assert response.status_code == 200
    assert response.json()["total_recognized"] == 0


def test_health_allows_head_requests():
    response = client.head("/health")

    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("application/json")


def test_requests_log_client_ip(caplog):
    with caplog.at_level(logging.INFO):
        response = client.get("/stats", headers={"X-Forwarded-For": "203.0.113.10"})

    assert response.status_code == 200
    assert "203.0.113.10" in caplog.text

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

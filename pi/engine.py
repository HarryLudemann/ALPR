"""ALPR inference wrapper for Raspberry Pi (CPU ONNX)."""

from __future__ import annotations

import os
import threading
import time
from typing import Any

import cv2
import numpy as np

os.environ.setdefault("ORT_DISABLE_TENSORRT", "1")
os.environ.setdefault("OMP_NUM_THREADS", os.environ.get("ALPR_THREADS", "4"))
os.environ.setdefault("ORT_NUM_THREADS", os.environ.get("ALPR_THREADS", "4"))

from plates import ocr_confidence_value, refine_plate_text


class AlprEngine:
    def __init__(self) -> None:
        from fast_alpr import ALPR

        self.detector_model = os.environ.get(
            "ALPR_DETECTOR_MODEL", "yolo-v9-t-384-license-plate-end2end"
        )
        self.ocr_model = os.environ.get(
            "ALPR_OCR_MODEL", "global-plates-mobile-vit-v2-model"
        )
        self.max_side = int(os.environ.get("ALPR_MAX_SIDE", "1600"))
        self._lock = threading.Lock()
        self.alpr = ALPR(
            detector_model=self.detector_model,
            ocr_model=self.ocr_model,
        )

    def _maybe_resize(self, frame: np.ndarray) -> tuple[np.ndarray, float]:
        height, width = frame.shape[:2]
        longest = max(height, width)
        if longest <= self.max_side:
            return frame, 1.0
        scale = self.max_side / longest
        resized = cv2.resize(
            frame,
            (int(width * scale), int(height * scale)),
            interpolation=cv2.INTER_AREA,
        )
        return resized, scale

    def recognize(self, image_bytes: bytes) -> dict[str, Any]:
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        frame = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image. Use JPEG, PNG, or WebP.")

        original_h, original_w = frame.shape[:2]
        frame, scale = self._maybe_resize(frame)
        height, width = frame.shape[:2]

        started = time.perf_counter()
        with self._lock:
            predictions = self.alpr.predict(frame)
        processing_ms = (time.perf_counter() - started) * 1000.0

        inverse = 1.0 / scale if scale else 1.0
        plates: list[dict[str, Any]] = []

        for prediction in predictions:
            box = prediction.detection.bounding_box
            x1, y1, x2, y2 = int(box.x1), int(box.y1), int(box.x2), int(box.y2)
            box_w, box_h = max(x2 - x1, 1), max(y2 - y1, 1)
            pad_x, pad_y = int(0.05 * box_w), int(0.05 * box_h)
            x1e = max(0, x1 - pad_x)
            y1e = max(0, y1 - pad_y)
            x2e = min(width, x2 + pad_x)
            y2e = min(height, y2 + pad_y)

            raw_text = ""
            ocr_conf = 0.0
            if prediction.ocr is not None:
                raw_text = (prediction.ocr.text or "").strip()
                ocr_conf = ocr_confidence_value(prediction.ocr.confidence)

            refined = refine_plate_text(raw_text)
            detection_conf = float(prediction.detection.confidence)

            plates.append(
                {
                    "text": refined["text"],
                    "raw_text": raw_text.upper().replace(" ", ""),
                    "confidence": round(ocr_conf, 4),
                    "detection_confidence": round(detection_conf, 4),
                    "pattern_confidence": refined["pattern_confidence"],
                    "is_nz_format": refined["is_nz_format"],
                    "bbox": {
                        "x1": int(round(x1e * inverse)),
                        "y1": int(round(y1e * inverse)),
                        "x2": int(round(x2e * inverse)),
                        "y2": int(round(y2e * inverse)),
                    },
                    "candidates": refined["candidates"],
                }
            )

        plates.sort(
            key=lambda item: (
                item["is_nz_format"],
                item["detection_confidence"],
                item["confidence"],
            ),
            reverse=True,
        )

        return {
            "ok": True,
            "plates": plates,
            "processing_ms": round(processing_ms, 1),
            "image": {"width": original_w, "height": original_h},
            "models": {
                "detector": self.detector_model,
                "ocr": self.ocr_model,
            },
        }

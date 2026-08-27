"""New Zealand plate text cleanup — production version.

Unlike the original test harness, this never looks at expected/ground-truth
plates. It only applies character-confusion swaps and NZ format scoring.
"""

from __future__ import annotations

import re
from typing import Any

NZ_PATTERNS = [
    r"^[A-HJ-NP-Z]{3}\d{3}$",
    r"^[A-HJ-NP-Z]{2}\d{3,4}$",
    r"^[A-HJ-NP-Z]{3}\d{4}$",
    r"^[A-Z]{1,3}\d{1,4}$",
]

CHAR_CORRECTIONS = {
    "0": ["O", "D", "Q"],
    "O": ["0", "D", "Q"],
    "1": ["I", "L", "7", "T"],
    "I": ["1", "L", "7", "T"],
    "L": ["1", "I", "7", "T"],
    "7": ["T", "1", "I", "2"],
    "T": ["7", "1", "I"],
    "2": ["Z", "7"],
    "Z": ["2"],
    "4": ["A", "U"],
    "8": ["B"],
    "B": ["8"],
    "5": ["S"],
    "S": ["5"],
    "Q": ["O", "0", "D"],
    "F": ["E"],
    "E": ["F"],
    "D": ["O", "0", "Q"],
    "U": ["V", "4"],
    "V": ["U"],
    "G": ["C", "O", "6"],
    "C": ["G", "O"],
    "M": ["N", "H", "W"],
    "N": ["M", "H"],
    "H": ["M", "N"],
    "R": ["A"],
    "W": ["M", "H"],
    "J": ["D"],
    "6": ["G", "0"],
}


def clean_text(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (text or "").upper())


def ocr_confidence_value(confidence: Any) -> float:
    if confidence is None:
        return 0.0
    if isinstance(confidence, (int, float)):
        value = float(confidence)
        return value / 100.0 if value > 1.0 else value
    if isinstance(confidence, (list, tuple)) and confidence:
        values = [float(v) for v in confidence]
        mean = sum(values) / len(values)
        return mean / 100.0 if mean > 1.0 else mean
    return 0.0


def score_nz(text: str) -> tuple[bool, float]:
    if not text or not (4 <= len(text) <= 8):
        return False, 0.0

    is_valid = any(re.match(pattern, text) for pattern in NZ_PATTERNS)

    if re.match(r"^[A-HJ-NP-Z]{3}\d{3,4}$", text):
        confidence = 0.95
    elif re.match(r"^[A-HJ-NP-Z]{2}\d{3,4}$", text):
        confidence = 0.85
    elif re.match(r"^[A-Z]{1,3}\d{1,4}$", text):
        confidence = 0.75
    elif is_valid:
        confidence = 0.6
    else:
        confidence = 0.35 if 4 <= len(text) <= 8 else 0.0

    return is_valid, confidence


def _neighbors(text: str) -> set[str]:
    """Single-character confusion swaps. Caps growth so Pi stays snappy."""
    found = {text}
    chars = list(text)
    for i, ch in enumerate(chars):
        for alt in CHAR_CORRECTIONS.get(ch, []):
            swapped = chars[:]
            swapped[i] = alt
            candidate = "".join(swapped)
            if 4 <= len(candidate) <= 8:
                found.add(candidate)
            if len(found) >= 48:
                return found
    return found


def refine_plate_text(raw: str) -> dict[str, Any]:
    cleaned = clean_text(raw)
    if not cleaned:
        return {
            "text": "",
            "is_nz_format": False,
            "pattern_confidence": 0.0,
            "candidates": [],
        }

    ranked: list[tuple[str, bool, float]] = []
    seen: set[str] = set()
    for candidate in _neighbors(cleaned):
        if candidate in seen:
            continue
        seen.add(candidate)
        valid, conf = score_nz(candidate)
        ranked.append((candidate, valid, conf))

    ranked.sort(key=lambda item: (item[1], item[2], item[0] == cleaned), reverse=True)
    best_text, best_valid, best_conf = ranked[0]

    # Trust the OCR string when it already looks like an NZ plate.
    original_valid, original_conf = score_nz(cleaned)
    if original_valid:
        best_text, best_valid, best_conf = cleaned, original_valid, original_conf

    nz_candidates = [item[0] for item in ranked if item[1] and item[0] != best_text]
    return {
        "text": best_text,
        "is_nz_format": best_valid,
        "pattern_confidence": round(best_conf, 4),
        "candidates": [best_text, *nz_candidates][:8],
    }

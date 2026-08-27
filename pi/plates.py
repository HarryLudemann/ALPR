"""New Zealand plate text cleanup — production version.

Ordinary NZ plates are at most 6 characters (typically AAA123). This never
looks at expected/ground-truth plates.
"""

from __future__ import annotations

import re
from typing import Any

# Current car series: 3 letters (no I/O) + 3 digits, numbers 100–999.
STANDARD_LLLNNN = re.compile(r"^[A-HJ-NP-Z]{3}[1-9]\d{2}$")
# Last two-letter series was often 2 letters + 4 digits (e.g. XM4677).
TWO_LETTER_4 = re.compile(r"^[A-HJ-NP-Z]{2}\d{4}$")
TWO_LETTER_3 = re.compile(r"^[A-HJ-NP-Z]{2}\d{3}$")
THREE_LETTER_2 = re.compile(r"^[A-HJ-NP-Z]{3}\d{1,2}$")
PERSONAL = re.compile(r"^[A-Z0-9]{4,6}$")

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
    if not text or len(text) < 4:
        return False, 0.0
    # Ordinary and personalised plates are 6 characters or fewer.
    if len(text) > 6:
        return False, 0.12

    if STANDARD_LLLNNN.match(text):
        return True, 0.96
    if TWO_LETTER_4.match(text):
        return True, 0.88
    if TWO_LETTER_3.match(text):
        return True, 0.82
    if THREE_LETTER_2.match(text):
        return True, 0.78
    if PERSONAL.match(text) and any(ch.isalpha() for ch in text) and any(ch.isdigit() for ch in text):
        return True, 0.58
    if PERSONAL.match(text):
        return True, 0.5
    return False, 0.28 if 4 <= len(text) <= 6 else 0.0


def is_structured(text: str) -> bool:
    return bool(
        STANDARD_LLLNNN.match(text)
        or TWO_LETTER_4.match(text)
        or TWO_LETTER_3.match(text)
        or THREE_LETTER_2.match(text)
    )


def _neighbors(text: str) -> set[str]:
    """Single-character confusion swaps. Caps growth so Pi stays snappy."""
    found = {text}
    chars = list(text)
    for i, ch in enumerate(chars):
        for alt in CHAR_CORRECTIONS.get(ch, []):
            swapped = chars[:]
            swapped[i] = alt
            candidate = "".join(swapped)
            if 4 <= len(candidate) <= 6:
                found.add(candidate)
            if len(found) >= 48:
                return found
    return found


def _length_candidates(text: str) -> set[str]:
    """Drop extra OCR glyphs. 7-char reads like HSA1377 are almost never real NZ plates."""
    found = {text}
    if 4 <= len(text) <= 6:
        return found

    for i in range(len(text)):
        trimmed = text[:i] + text[i + 1 :]
        if 4 <= len(trimmed) <= 6:
            found.add(trimmed)

    if len(text) >= 7:
        found.add(text[:6])
        found.add(text[-6:])
        found.add(text[1:7])

    return {item for item in found if 4 <= len(item) <= 6} or {text}


def _alignment(candidate: str, raw: str) -> tuple[int, int]:
    """Prefer keeping the start of the OCR string (trailing frame glyphs are common)."""
    if candidate == raw:
        return (2, len(candidate))
    if raw.startswith(candidate):
        return (1, len(candidate))
    if raw.endswith(candidate):
        return (0, len(candidate))
    return (-1, 0)


def refine_plate_text(raw: str) -> dict[str, Any]:
    cleaned = clean_text(raw)
    if not cleaned:
        return {
            "text": "",
            "is_nz_format": False,
            "pattern_confidence": 0.0,
            "candidates": [],
        }

    if 4 <= len(cleaned) <= 6 and is_structured(cleaned):
        valid, conf = score_nz(cleaned)
        return {
            "text": cleaned,
            "is_nz_format": valid,
            "pattern_confidence": round(conf, 4),
            "candidates": [cleaned],
        }

    seeds = _length_candidates(cleaned)
    ranked: list[tuple[str, bool, float]] = []
    seen: set[str] = set()
    for seed in seeds:
        for candidate in _neighbors(seed):
            if candidate in seen:
                continue
            seen.add(candidate)
            valid, conf = score_nz(candidate)
            ranked.append((candidate, valid, conf))

    ranked.sort(
        key=lambda item: (
            item[2],
            item[1],
            _alignment(item[0], cleaned),
        ),
        reverse=True,
    )
    best_text, best_valid, best_conf = ranked[0]
    original_valid, original_conf = score_nz(cleaned)
    if is_structured(best_text) and not is_structured(cleaned):
        pass
    elif 4 <= len(cleaned) <= 6 and original_valid:
        best_text, best_valid, best_conf = cleaned, original_valid, original_conf

    nz_candidates = [item[0] for item in ranked if item[1] and item[0] != best_text]
    return {
        "text": best_text,
        "is_nz_format": best_valid,
        "pattern_confidence": round(best_conf, 4),
        "candidates": [best_text, *nz_candidates][:8],
    }

"""Find words the narrator will probably mispronounce (names, invented words).

Capitalised words in the middle of a sentence are almost always proper nouns;
they are the first candidates for the pronunciation dictionary.
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Callable, Iterable
from dataclasses import dataclass

_SENTENCE_END = re.compile(r"(?<=[.!?…:;])[\"'”’»)\]]*\s+")
_WORD = re.compile(r"[^\W\d_](?:[\w'’-]*[^\W_])?")
# Capitalised mid-sentence in normal prose, never worth a rule.
_COMMON = {
    "i", "i'm", "i've", "i'll", "i'd", "mr", "mrs", "ms", "dr", "st", "sir", "madam", "lord", "lady",
    "god", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august", "september",
    "october", "november", "december", "chapter", "part", "book", "ok", "okay",
}


@dataclass
class NameCandidate:
    word: str
    count: int
    example: str


def find_names(
    texts: Iterable[str],
    min_count: int = 2,
    limit: int = 150,
    exclude: Callable[[str], bool] | None = None,
) -> list[NameCandidate]:
    capitalised: Counter[str] = Counter()
    # Capitalised at a sentence start: counted only for words also seen mid-sentence.
    starts: Counter[str] = Counter()
    lowercase: Counter[str] = Counter()
    examples: dict[str, str] = {}
    for text in texts:
        for paragraph in text.split("\n"):
            for sentence in _SENTENCE_END.split(paragraph):
                words = list(_WORD.finditer(sentence))
                for index, match in enumerate(words):
                    word = re.sub(r"['’]s$", "", match.group(0)).strip("'’-")
                    if not word:
                        continue
                    if word[0].islower():
                        lowercase[word.lower()] += 1
                        continue
                    if (word.isupper() and len(word) > 1) or len(word) < 2:
                        continue  # acronym/shouting or single letter
                    if index == 0:
                        starts[word] += 1
                        continue
                    capitalised[word] += 1
                    if word not in examples:
                        start, end = max(0, match.start() - 50), min(len(sentence), match.end() + 50)
                        examples[word] = ("…" if start else "") + sentence[start:end].strip() + ("…" if end < len(sentence) else "")
    result = []
    for word, mid in capitalised.items():
        key = word.lower()
        count = mid + starts[word]
        if count < min_count or key in _COMMON or key.rstrip("s'’") in _COMMON:
            continue
        if lowercase[key] >= mid:
            continue  # an ordinary word that just starts some line or title
        if exclude is not None and exclude(word):
            continue
        result.append(NameCandidate(word, count, examples[word]))
    result.sort(key=lambda c: (-c.count, c.word.lower()))
    return result[:limit]

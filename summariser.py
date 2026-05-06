import re
from collections import Counter

STOPWORDS = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "is","are","was","were","be","been","being","have","has","had","do","does",
    "did","will","would","could","should","may","might","shall","can","that",
    "this","these","those","it","its","i","we","you","he","she","they","them",
    "their","there","then","than","as","if","so","by","from","up","out","about",
    "into","through","during","before","after","above","below","between","each",
    "not","no","nor","also","just","only","both","either","all","any","more",
    "most","other","such","same","own","which","who","whom","how","when","where",
    "while","although","because","since","however","therefore","thus","hence",
}


def _split_sentences(text):
    # Split on sentence-ending punctuation, keep the delimiter attached
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in raw if len(s.strip()) > 10]
    return sentences


def _word_freq(sentences):
    all_words = []
    for s in sentences:
        words = re.findall(r'\b[a-z]+\b', s.lower())
        all_words.extend(w for w in words if w not in STOPWORDS)
    return Counter(all_words)


def _score_sentences(sentences, freq):
    n = len(sentences)
    scores = []
    max_freq = max(freq.values()) if freq else 1

    for i, sentence in enumerate(sentences):
        words = re.findall(r'\b[a-z]+\b', sentence.lower())
        content_words = [w for w in words if w not in STOPWORDS]

        if not content_words:
            scores.append(0.0)
            continue

        # Frequency score: sum of normalised word frequencies
        freq_score = sum(freq.get(w, 0) / max_freq for w in content_words) / len(content_words)

        # Position boost: first and last sentences tend to be important
        if i == 0 or i == n - 1:
            pos_boost = 0.2
        elif i < n * 0.2:
            pos_boost = 0.1
        else:
            pos_boost = 0.0

        # Length penalty: penalise very short (<5 words) or very long (>40 words)
        wc = len(words)
        if wc < 5:
            length_penalty = -0.3
        elif wc > 40:
            length_penalty = -0.1
        else:
            length_penalty = 0.0

        scores.append(freq_score + pos_boost + length_penalty)

    return scores


def summarise(text, top_n=None):
    sentences = _split_sentences(text)
    if not sentences:
        return "• (No content to summarise.)"

    freq = _word_freq(sentences)
    scores = _score_sentences(sentences, freq)

    n = len(sentences)
    if top_n is None:
        top_n = max(3, min(10, round(n * 0.30)))

    # Pick top-scoring sentences, then re-sort by original position
    indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    selected_indices = sorted(i for i, _ in indexed[:top_n])

    bullet_lines = ["## Summary\n"]
    for idx in selected_indices:
        bullet_lines.append(f"• {sentences[idx].strip()}")

    return "\n".join(bullet_lines)


if __name__ == "__main__":
    sample = (
        "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of sugar. "
        "It occurs mainly in the leaves of plants, where chlorophyll captures light energy. "
        "The light-dependent reactions take place in the thylakoid membranes and produce ATP and NADPH. "
        "The Calvin cycle, which is the light-independent stage, uses these products to fix carbon dioxide into glucose. "
        "Photosynthesis is essential for life on Earth because it forms the base of most food chains. "
        "Without it, there would be no oxygen in the atmosphere and no organic compounds for heterotrophs to consume. "
        "Factors such as light intensity, temperature, and carbon dioxide concentration affect the rate of photosynthesis. "
        "Plants have evolved various adaptations to maximise their photosynthetic efficiency in different environments. "
        "Desert plants like cacti have thick waxy cuticles to reduce water loss while still allowing gas exchange. "
        "Aquatic plants have special air spaces called aerenchyma that help gases diffuse throughout the plant."
    )
    print(summarise(sample))

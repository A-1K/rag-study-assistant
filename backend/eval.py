"""
Retrieval evaluation — measures hit rate @ k.

For each test question we know which page the answer is on. We retrieve the
top-k chunks and check whether that page is among them. No LLM call is made,
so this is free to run and tests retrieval quality in isolation — the part you
tune via chunk size / overlap / k / embedding model.

Run from the backend/ folder:   python eval.py
"""

from retriever import retriever

# Ground truth from data/sample_slide.pdf  (DS211 Lecture 10 — Text Data).
# "page" is 0-indexed to match Chroma metadata (slide N in the PDF = page N-1).
TEST_CASES = [
    {"q": "What kinds of string data are there?",                "page": 1},
    {"q": "What is the bag-of-words representation?",            "page": 2},
    {"q": "What are the three steps to compute bag-of-words?",   "page": 3},
    {"q": "What are stopwords?",                                 "page": 5},
    {"q": "What is the intuition behind the tf-idf method?",     "page": 6},
    {"q": "How is the tf-idf score calculated?",                 "page": 7},
    {"q": "What problem with bag-of-words do n-grams address?",  "page": 9},
    {"q": "What is tokenization in feature extraction?",         "page": 13},
    {"q": "What is lemmatization?",                              "page": 15},
    {"q": "What is stemming?",                                   "page": 16},
    {"q": "What is one-hot coding?",                             "page": 18},
    {"q": "What is a word embedding / model-based encoder?",     "page": 20},
]


def pages_for(question):
    docs = retriever.invoke(question)
    return [d.metadata.get("page") for d in docs]


def main():
    hits = 0
    print("Retrieval eval — is the correct page in the top-k?\n")
    for case in TEST_CASES:
        pages = pages_for(case["q"])
        hit = case["page"] in pages
        hits += hit                       # True == 1, False == 0
        mark = "PASS" if hit else "FAIL"
        print(f"  [{mark}] expected p{case['page']:<2} got {pages}  | {case['q']}")

    total = len(TEST_CASES)
    print(f"\nHit rate @k: {hits}/{total} = {hits / total:.0%}")


if __name__ == "__main__":
    main()

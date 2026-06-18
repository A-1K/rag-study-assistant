from retriever import retriever

testcases = [
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


hits = 0
top1hits = 0
print("Retrieval eval: is the correct page in the top-k?\n")

for case in testcases:
    pages = pages_for(case["q"])
    at_top1 = pages[0] == case["page"]
    top1hits += at_top1
    hit = case["page"] in pages
    hits += hit                      # true ->  1, false -> 0
    mark = "PASS" if hit else "FAIL"
    print(f"  [{mark}] expected p{case['page']:<3} got {pages}  | {case['q']}")



accuracy = hits / len(testcases)
print(f"\nHit rate @k: {hits}/{len(testcases)} = {accuracy:.0%}")
print(f"Hit rate @1: {top1hits}/{len(testcases)} = {top1hits/len(testcases):.0%}")

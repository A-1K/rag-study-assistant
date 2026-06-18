from flask import Flask, request, jsonify
from flask_cors import CORS

from retriever import ask   

app = Flask(__name__)
CORS(app)

@app.route("/ask", methods=["POST"])
def ask_route():
    data = request.get_json()
    question = data["question"]
    answer, docs = ask(question)  

    sources = [
        {
            "page": d.metadata.get("page"),
            "text": d.page_content[:200],   
        }
        for d in docs
    ]

    return jsonify({
        "answer": answer,
        "sources": sources,
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
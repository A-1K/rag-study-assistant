from flask import Flask, request, jsonify
from flask_cors import CORS

from retriever import ask   

app = Flask(__name__)
CORS(app)

@app.route("/ask", methods=["POST"])
def ask_route():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"error": "Please provide a question."}), 400
    
    try:
        answer, docs = ask(question)
        
    except Exception:
        app.logger.exception("ask() failed")
        return jsonify({"error": "The assistant is temporarily unavailable. Try again in a moment."}), 503
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
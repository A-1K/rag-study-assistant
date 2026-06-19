import os
import re 
import tempfile

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from retriever import ask, replace_doc
from ingest import loadandchunk



DIST_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist"
)

app = Flask(__name__, static_folder=DIST_DIR, static_url_path="")
CORS(app)

@app.route("/upload", methods=["POST"])
def upload_route():
    file = request.files.get("file")
    if file is None:
        return jsonify({"error": "No file uploaded."}), 400
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file."}), 400

    path = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    file.save(path.name)
    path.close()

    try:   
        docs, chunks = loadandchunk(path.name)
        if not chunks:
            return jsonify({"error": "Couldn't extract any text from that PDF (is it scanned images?)."}), 400
        replace_doc(chunks)
    except Exception:
        app.logger.exception("upload failed")
        return jsonify({"error": "Could not process that PDF."}), 500
    finally:
        os.remove(path.name)   

    return jsonify({"status": "indexed", "filename": file.filename,
                    "pages": len(docs), "chunks": len(chunks)})

@app.route("/")
def index():
    return send_from_directory(DIST_DIR, "index.html")

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
    # Show only the sources the answer actually cited (deduped by page).
    cited = {int(n) for n in re.findall(r"Page\s*(\d+)", answer)}
    seen = set()
    sources = []
    for d in docs:
        page = d.metadata.get("page")
        if page in cited and page not in seen:
            seen.add(page)
            sources.append({"page": page, "text": d.page_content[:200]})
            
    return jsonify({
        "answer": answer,
        "sources": sources,
     })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
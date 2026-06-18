import { useState } from "react";
import "./App.css";

// Where the Flask backend lives. CORS(app) on the server allows this cross-origin call.
const API_URL = "http://127.0.0.1:5000/ask";

// The exact string the prompt tells Gemini to return when it can't answer.
const REFUSAL = "Not covered in the uploaded materials";

const EXAMPLES = [
  "What is the bag-of-words representation?",
  "Explain tf–idf and why it is useful.",
  "What are the steps to compute bag-of-words?",
];

export default function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState("");

  async function ask(q) {
    const query = q.trim();
    if (!query) return;

    setStatus("loading");
    setErrorMsg("");
    setAnswer(null);
    setSources([]);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources ?? []);
      setStatus("done");
    } catch (err) {
      setErrorMsg(
        err.message.includes("fetch")
          ? "Couldn't reach the server. Is the Flask backend running on port 5000?"
          : err.message,
      );
      setStatus("error");
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    ask(question);
  }

  function onKeyDown(e) {
    // Enter submits; Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(question);
    }
  }

  function runExample(q) {
    setQuestion(q);
    ask(q);
  }

  const loading = status === "loading";
  const isRefusal =
    status === "done" && (answer ?? "").trim().startsWith(REFUSAL);

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <LogoMark />
          <span className="brand__name">Study Assistant</span>
        </div>
        <p className="brand__tag">
          Ask questions about your lecture notes — answers cite the page they
          came from.
        </p>
      </header>

      <main className="main">
        <form className="composer" onSubmit={onSubmit}>
          <label htmlFor="q" className="sr-only">
            Your question
          </label>
          <textarea
            id="q"
            className="composer__input"
            placeholder="Ask a question about your notes…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={loading}
          />
          <button
            type="submit"
            className="composer__btn"
            disabled={loading || !question.trim()}
            aria-label="Ask question"
          >
            {loading ? <Spinner /> : <SendIcon />}
            <span>{loading ? "Thinking" : "Ask"}</span>
          </button>
        </form>

        {/* Results region — aria-live announces updates to screen readers */}
        <section className="results" aria-live="polite">
          {status === "idle" && (
            <EmptyState examples={EXAMPLES} onPick={runExample} />
          )}

          {loading && <AnswerSkeleton />}

          {status === "error" && <ErrorCard message={errorMsg} />}

          {status === "done" && (
            <>
              <AnswerCard answer={answer} isRefusal={isRefusal} />
              {!isRefusal && sources.length > 0 && (
                <Sources sources={sources} />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

/* ---------- Answer ---------- */

function AnswerCard({ answer, isRefusal }) {
  if (isRefusal) {
    return (
      <div className="card answer answer--refusal">
        <InfoIcon />
        <p>{answer}</p>
      </div>
    );
  }
  return (
    <div className="card answer">
      <div className="answer__label">Answer</div>
      <div className="answer__body">{renderWithCitations(answer)}</div>
    </div>
  );
}

// Turn "[Page 2, Page 3]" inside the answer into small accent chips.
function renderWithCitations(text) {
  const parts = text.split(/(\[Page[^\]]*\])/g);
  return parts.map((part, i) =>
    /^\[Page[^\]]*\]$/.test(part) ? (
      <span key={i} className="cite">
        {part.replace(/[[\]]/g, "")}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/* ---------- Sources ---------- */

function Sources({ sources }) {
  return (
    <div className="sources">
      <div className="sources__label">Sources</div>
      <ul className="sources__list">
        {sources.map((s, i) => (
          <li key={i} className="card source">
            <span className="source__page">Page {s.page}</span>
            <p className="source__text">{s.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- States ---------- */

function EmptyState({ examples, onPick }) {
  return (
    <div className="empty">
      <p className="empty__title">What do you want to understand?</p>
      <p className="empty__hint">Try one of these to start:</p>
      <div className="empty__chips">
        {examples.map((q) => (
          <button
            key={q}
            type="button"
            className="chip"
            onClick={() => onPick(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnswerSkeleton() {
  return (
    <div className="card answer" aria-hidden="true">
      <div className="answer__label">Answer</div>
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line short" />
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div className="card error" role="alert">
      <p>{message}</p>
    </div>
  );
}

/* ---------- Icons (inline SVG, no emoji) ---------- */

function LogoMark() {
  return (
    <svg
      className="logo"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      width="22"
      height="22"
    >
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
        fill="var(--accent)"
      />
      <path
        d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"
        fill="var(--accent)"
        opacity="0.45"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M4 12 20 4l-4 16-4-7-8-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 11v5M12 8h.01"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

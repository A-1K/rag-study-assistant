import { useState, useEffect } from "react";
import "./App.css";

// Where the Flask backend lives. CORS(app) on the server allows this cross-origin call.
const API_URL = "http://127.0.0.1:5000/ask";

// The exact string the prompt tells the model to return when it can't answer.
const REFUSAL = "Not covered in the uploaded materials";

const REPO_URL = "https://github.com/A-1K/rag-study-assistant";

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

  // Theme starts from whatever the pre-paint script set on <html>.
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "light",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* ignore storage errors (e.g. private mode) */
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

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

      // Surface the backend's own error message (e.g. the 400 / 503 JSON).
      if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch (e) {
          /* response had no JSON body */
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources ?? []);
      setStatus("done");
    } catch (err) {
      setErrorMsg(
        err.message === "Failed to fetch"
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
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <LogoMark />
            <span className="brand__name">Study Assistant</span>
          </div>

          <div className="topbar__actions">
            <a
              className="ghost-btn"
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon />
              <span className="ghost-btn__label">GitHub</span>
            </a>

            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <p className="intro">
          Ask questions about your lecture notes — answers cite the page they
          came from.
        </p>

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

      <footer className="footer">
        <span>RAG study assistant</span>
        <span className="footer__dot">·</span>
        <span>React · Flask · ChromaDB · Groq</span>
        <span className="footer__dot">·</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </footer>
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

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.05 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.71 1.03 1.62 1.03 2.74 0 3.92-2.34 4.78-4.57 5.04.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.01 10.01 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
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

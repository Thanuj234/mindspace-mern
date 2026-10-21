import { useEffect, useRef, useState } from "react";
import { BookOpen, Brain, ChevronDown, CornerDownLeft, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./ai-memory.css";

const suggestions = [
  "Find my journal about personal growth",
  "What have I written about my goals?",
  "Find a story I wrote about creativity",
];

function formatDate(value) {
  if (!value) return "Saved in MindSpace";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved in MindSpace";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AskYourMemoryWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function ask(value = question) {
    const cleanQuestion = value.trim();
    if (!cleanQuestion || loading) return;
    setQuestion("");
    setError("");
    setMessages((current) => [...current, { role: "user", text: cleanQuestion }]);
    setLoading(true);
    try {
      const response = await api.post("/ai/ask-memory", { question: cleanQuestion });
      setMessages((current) => [...current, {
        role: "assistant",
        text: response.data?.answer || "I couldn't find an answer in your saved writing.",
        sources: Array.isArray(response.data?.sources) ? response.data.sources : [],
      }]);
    } catch (err) {
      setError(err.response?.data?.message || "I couldn't search your memory right now. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    ask();
  }

  function resetChat() {
    setMessages([]);
    setQuestion("");
    setError("");
  }

  return (
    <div className="ask-memory-widget">
      {open && (
        <section className="ask-memory-panel" aria-label="Ask Your Memory chat">
          <header className="ask-memory-header">
            <span className="ask-memory-brand-icon"><Brain size={21} /></span>
            <div className="ask-memory-header-copy">
              <strong>Ask Your Memory</strong>
              <span>Your thoughts, remembered.</span>
            </div>
            <button className="ask-memory-icon-button" type="button" onClick={resetChat} title="Start a new chat" aria-label="Start a new chat">
              <Sparkles size={17} />
            </button>
            <button className="ask-memory-icon-button" type="button" onClick={() => setOpen(false)} title="Minimize chat" aria-label="Minimize chat">
              <ChevronDown size={19} />
            </button>
          </header>

          <div className="ask-memory-messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ask-memory-welcome">
                <span className="ask-memory-welcome-icon"><BookOpen size={23} /></span>
                <h3>Reconnect with your thoughts.</h3>
                <p>Ask about something you wrote. I'll look through your saved journals and stories.</p>
                <div className="ask-memory-suggestions">
                  {suggestions.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => ask(suggestion)} disabled={loading}>
                      {suggestion}<CornerDownLeft size={14} />
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.map((message, index) => (
              <article className={`ask-memory-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.role === "assistant" && <span className="ask-memory-message-mark"><Sparkles size={14} /></span>}
                <div className="ask-memory-message-body">
                  <p>{message.text}</p>
                  {message.sources?.length > 0 && (
                    <div className="ask-memory-sources">
                      <span className="ask-memory-sources-title">FOUND IN YOUR SPACE</span>
                      {message.sources.map((source) => (
                        <Link to={source.url} key={`${source.type}-${source.id}`} className="ask-memory-source" onClick={() => setOpen(false)}>
                          <span className={`ask-memory-source-icon ${source.type}`}><BookOpen size={15} /></span>
                          <span className="ask-memory-source-copy">
                            <strong>{source.title}</strong>
                            <small>{source.type === "journal" ? "Private journal" : source.status === "published" ? "Published story" : "Your draft"} · {formatDate(source.date)}</small>
                          </span>
                          <span className="ask-memory-source-arrow">↗</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
            {loading && <div className="ask-memory-thinking"><LoaderCircle size={16} className="ask-memory-spinner" /> Looking through your writing…</div>}
            <div ref={endRef} />
          </div>

          {error && <p className="ask-memory-error" role="alert">{error}</p>}

          <form className="ask-memory-composer" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about your journals or stories…"
              rows={2}
              maxLength={1000}
              aria-label="Ask your memory a question"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
            />
            <button type="submit" disabled={loading || !question.trim()} aria-label="Send question">
              {loading ? <LoaderCircle size={17} className="ask-memory-spinner" /> : <Send size={17} />}
            </button>
          </form>
          <p className="ask-memory-privacy">🔒 Only your own saved journals and stories are searched.</p>
        </section>
      )}

      <button className={`ask-memory-launcher${open ? " is-open" : ""}`} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close Ask Your Memory" : "Open Ask Your Memory"}>
        {open ? <X size={21} /> : <MessageCircle size={21} />}
        {!open && <><span>Ask Your Memory</span><Sparkles size={16} /></>}
      </button>
    </div>
  );
}

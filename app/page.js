"use client";

import { useEffect, useRef, useState } from "react";


function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  );
}

/* ─── root ─────────────────────────────────────────────────────────────── */

const SUGGESTIONS = [
  "Summarize this document",
  "What are the key takeaways?",
  "Explain the main argument",
  "What conclusions does it reach?",
];

export default function Home() {
  const [session, setSession]       = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [asking, setAsking]         = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef    = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, asking]);

  useEffect(() => {
    const s = localStorage.getItem("notebook-session");
    if (s) setSession(JSON.parse(s));
    const m = localStorage.getItem("notebook-messages");
    if (m) setMessages(JSON.parse(m));
  }, []);

  useEffect(() => {
    if (session) localStorage.setItem("notebook-session", JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    localStorage.setItem("notebook-messages", JSON.stringify(messages));
  }, [messages]);

  async function handleUpload(file) {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    setMessages([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/ingest", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSession(data);
    } catch (err) {
      setUploadError(err.message);
      setSession(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk(e) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || !session || asking) return;
    setInput("");
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setAsking(true);
    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          question:  q,
          history:   messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer");
      setMessages([...next, { role: "assistant", content: data.answer, citations: data.citations }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `Error: ${err.message}`, error: true }]);
    } finally {
      setAsking(false);
    }
  }

  function reset() {
    setSession(null);
    setMessages([]);
    setUploadError("");
    localStorage.removeItem("notebook-session");
    localStorage.removeItem("notebook-messages");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-1 flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>

      {/* ── header ── */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--accent)" }}><IconBook /></span>
          <div>
            <span className="font-semibold text-[15px] tracking-tight">NotebookLM Lite</span>
            <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>RAG-powered document Q&amp;A</span>
          </div>
        </div>

        {session && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.borderColor = "var(--muted)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)";    e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            New document
          </button>
        )}
      </header>

      {/* ── main ── */}
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-6" style={{ minHeight: 0 }}>
        {!session ? (
          <UploadPanel
            uploading={uploading}
            error={uploadError}
            onUpload={handleUpload}
            inputRef={fileInputRef}
          />
        ) : (
          <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
            <SessionBanner session={session} />

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-5 space-y-4" style={{ minHeight: 0 }}>
              {messages.length === 0 && (
                <EmptyChatHint
                  fileName={session.fileName}
                  onSuggest={(s) => { setInput(s); }}
                />
              )}
              {messages.map((m, i) => <Message key={i} message={m} />)}
              {asking && <TypingIndicator />}
            </div>

            <form
              onSubmit={handleAsk}
              className="flex gap-2 pt-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                placeholder="Ask a question about your document…"
                disabled={asking}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)"; }}
                onBlur={e  => { e.target.style.borderColor = "var(--border)";  e.target.style.boxShadow = "none"; }}
              />
              <button
                type="submit"
                disabled={asking || !input.trim()}
                className="flex items-center justify-center rounded-xl w-10 h-10 flex-shrink-0 transition-all"
                style={{
                  background: asking || !input.trim() ? "var(--border)" : "var(--accent)",
                  color: "white",
                  cursor: asking || !input.trim() ? "not-allowed" : "pointer",
                }}
                title="Send"
              >
                <IconSend />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── footer ── */}
      <footer className="text-center text-xs py-4" style={{ color: "var(--muted)" }}>
        Built with Next.js · Groq · HuggingFace · Qdrant
      </footer>
    </div>
  );
}

/* ─── upload panel ──────────────────────────────────────────────────────── */

function UploadPanel({ uploading, error, onUpload, inputRef }) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Upload a document</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          PDF or .txt file · up to 15 MB
        </p>
      </div>

      <div
        className="w-full max-w-md rounded-2xl p-10 text-center transition-all cursor-pointer select-none"
        style={{
          background: dragActive ? "color-mix(in srgb, var(--accent) 6%, var(--surface))" : "var(--surface)",
          border: `2px dashed ${dragActive ? "var(--accent)" : "var(--border)"}`,
          boxShadow: dragActive ? "0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent)" : "none",
          transition: "all 0.18s ease",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true);  }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onUpload(file);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <div
          className="flex items-center justify-center mx-auto mb-5 rounded-full w-16 h-16"
          style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}
        >
          {uploading
            ? <svg className="spin-slow" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            : <IconUpload />
          }
        </div>

        <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
          {uploading ? "Indexing your document…" : "Drop your file here"}
        </p>
        <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
          {uploading ? "This usually takes 20–40 seconds" : "or click anywhere in this box to browse"}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => onUpload(e.target.files?.[0])}
          disabled={uploading}
        />

        {!uploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-all"
            style={{ background: "var(--accent)", color: "white" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            Choose file
          </button>
        )}

        {error && (
          <p className="mt-4 text-sm" style={{ color: "#DC2626" }}>{error}</p>
        )}
      </div>

      {/* step hints */}
      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
        {["Upload document", "Semantic indexing", "Ask anything"].map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span>→</span>}
            <span
              className="flex items-center justify-center rounded-full w-5 h-5 text-[10px] font-semibold"
              style={{ background: "var(--border)", color: "var(--muted)" }}
            >
              {i + 1}
            </span>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── session banner ────────────────────────────────────────────────────── */

function SessionBanner({ session }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 mb-1 text-sm"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span style={{ color: "var(--accent)" }}><IconFile /></span>
      <span className="font-medium truncate flex-1">{session.fileName}</span>
      <span
        className="rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0"
        style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}
      >
        {session.pages} {session.pages === 1 ? "page" : "pages"}
      </span>
      <span
        className="rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0"
        style={{ background: "var(--border)", color: "var(--muted)" }}
      >
        {session.chunks} chunks
      </span>
    </div>
  );
}

/* ─── empty state ───────────────────────────────────────────────────────── */

function EmptyChatHint({ fileName, onSuggest }) {
  return (
    <div className="flex flex-col items-center text-center py-10 gap-5">
      <div
        className="flex items-center justify-center rounded-full w-12 h-12"
        style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}
      >
        <IconSparkle />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Ready to explore</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Ask anything about <span className="font-medium" style={{ color: "var(--foreground)" }}>{fileName}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="rounded-full px-3.5 py-1.5 text-xs transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}


function TypingIndicator() {
  return (
    <div className="flex justify-start msg-animate">
      <div
        className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <span className="text-xs" style={{ color: "var(--muted)" }}>Thinking</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot block rounded-full"
              style={{ width: 5, height: 5, background: "var(--accent)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── message ───────────────────────────────────────────────────────────── */

function Message({ message }) {
  const [citOpen, setCitOpen] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex msg-animate ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[82%] rounded-2xl px-4 py-3 text-sm"
        style={
          isUser
            ? { background: "#18181B", color: "#F4F4F5" }
            : message.error
            ? { background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }
            : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }
        }
      >
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>

        {!isUser && !message.error && message.citations?.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setCitOpen(!citOpen)}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: "var(--muted)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--foreground)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
            >
              <IconChevron open={citOpen} />
              {message.citations.length} source{message.citations.length !== 1 ? "s" : ""}
            </button>

            {citOpen && (
              <div className="mt-2 space-y-2">
                {message.citations.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-2.5 text-xs"
                    style={{ background: "color-mix(in srgb, var(--accent) 5%, var(--background))", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        #{i + 1}
                      </span>
                      {c.page != null && (
                        <span style={{ color: "var(--muted)" }}>Page {c.page}</span>
                      )}
                    </div>
                    <p className="leading-relaxed line-clamp-3" style={{ color: "var(--muted)" }}>
                      {c.snippet}…
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

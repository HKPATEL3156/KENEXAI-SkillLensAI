import React, { useState, useRef, useEffect } from "react";

/**
 * ChatWidget — floating chat bubble for AI assistant
 *
 * Props:
 *   axiosInstance  — api or companyApi from services/api.js
 *   endpoint       — "/api/chat/candidate" or "/api/chat/company"
 *   title          — display title e.g. "Career Assistant"
 *   subtitle       — short description shown in header
 *   placeholder    — input placeholder text
 *   accentColor    — tailwind bg color class for send button and user bubbles (default: "indigo")
 */
const ChatWidget = ({
  axiosInstance,
  endpoint,
  title = "AI Assistant",
  subtitle = "Ask me anything",
  placeholder = "Ask a question…",
  accentColor = "indigo",
}) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: `Hi! I'm your ${title}. Ask me anything — I have access to your profile and job data.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", text };
    setMessages((prev) => [...prev.slice(-19), userMsg]); // keep max 20 messages
    setInput("");
    setLoading(true);

    try {
      const res = await axiosInstance.post(endpoint, { message: text });
      const reply = res.data.reply || "Sorry, I couldn't get a response right now.";
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (e) {
      const errMsg =
        e?.response?.data?.message ||
        "Something went wrong. Please check your connection and try again.";
      setMessages((prev) => [...prev, { role: "ai", text: `⚠️ ${errMsg}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── Floating Bubble ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open AI Assistant"}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white text-2xl transition-all duration-200 hover:scale-110`}
        style={{ boxShadow: "0 8px 32px rgba(79,70,229,0.35)" }}
      >
        {open ? "✕" : "💬"}
      </button>

      {/* ── Chat Panel ── */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right ${
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{ height: "500px" }}
      >
        {/* Header */}
        <div className={`rounded-t-2xl bg-${accentColor}-600 px-4 py-3 flex items-center gap-3`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg shrink-0">
            🤖
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{title}</div>
            <div className="text-[11px] text-white/70 truncate">{subtitle}</div>
          </div>
          <div className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 shrink-0" title="Online" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <div className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs mt-1">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? `bg-${accentColor}-600 text-white rounded-br-sm`
                    : msg.isError
                    ? "bg-rose-50 text-rose-700 border border-rose-200 rounded-bl-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs mt-1">
                🤖
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 px-3 py-2.5 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 max-h-24 overflow-y-auto"
            style={{ lineHeight: "1.4" }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-${accentColor}-600 text-white hover:bg-${accentColor}-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
          >
            {loading ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-3 pb-2 text-[10px] text-slate-400 text-center">
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>
    </>
  );
};

export default ChatWidget;

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, API_BASE } from '@/lib/api';

type Message = {
  role: "user" | "assistant";
  content: string;
  type?: "faq" | "ai";
  feedbackGiven?: boolean;
};

const CHAT_URL = `${API_BASE}/support-chat`;

function getSessionId(): string {
  let id = localStorage.getItem("songkart_chat_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("songkart_chat_session", id);
  }
  return id;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async (overrideText?: string, skipFaq?: boolean) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;

    if (!overrideText) setInput("");
    setError(null);
    const userMsg: Message = { role: "user", content: text };
    const newMessages = overrideText ? messages : [...messages, userMsg];
    if (!overrideText) setMessages(newMessages);
    setLoading(true);

    try {
      const resp = await apiFetch(CHAT_URL, {
        method: "POST",
        body: JSON.stringify({
          messages: overrideText ? newMessages : newMessages,
          session_id: getSessionId(),
          skip_faq: skipFaq || false,
        }),
      });

      if (resp.status === 429) {
        setError("You're sending messages too quickly. Please wait a moment.");
        setLoading(false);
        return;
      }

      const data = await resp.json();
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            type: data.type || "ai",
          },
        ]);
      } else {
        setError("Failed to get a response. Please try again.");
      }
    } catch {
      setError("Connection error. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleFaqFeedback = useCallback((msgIndex: number, helpful: boolean) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, feedbackGiven: true } : m))
    );

    if (!helpful) {
      // Re-send the original question but skip FAQ this time
      const originalQuestion = messages
        .slice(0, msgIndex)
        .reverse()
        .find((m) => m.role === "user");
      if (originalQuestion) {
        sendMessage(originalQuestion.content, true);
      }
    }
  }, [messages, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Simple markdown-ish rendering: bold and bullet points
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      // Bullet points
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        return (
          <li key={i} className="ml-4 list-disc">
            {parts}
          </li>
        );
      }

      return (
        <p key={i} className={line.trim() === "" ? "h-2" : ""}>
          {parts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
          aria-label="Open chat support"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">SongKart Support</p>
                <p className="text-xs opacity-80">Ask me anything about SongKart</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 transition-colors hover:bg-white/20"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                <Bot className="h-10 w-10 opacity-40" />
                <p className="text-sm">Hi! 👋 How can I help you today?</p>
                <p className="text-xs opacity-70">Ask about buying, selling, licensing, or account issues.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {renderContent(msg.content)}
                  </div>
                </div>

                {/* FAQ feedback buttons */}
                {msg.role === "assistant" && msg.type === "faq" && !msg.feedbackGiven && (
                  <div className="ml-9 mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Was this helpful?</span>
                    <button
                      onClick={() => handleFaqFeedback(i, true)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <ThumbsUp className="h-3 w-3" /> Yes
                    </button>
                    <button
                      onClick={() => handleFaqFeedback(i, false)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <ThumbsDown className="h-3 w-3" /> No
                    </button>
                  </div>
                )}
                {msg.role === "assistant" && msg.type === "faq" && msg.feedbackGiven && (
                  <div className="ml-9 mt-1 text-xs text-muted-foreground">
                    Thanks for your feedback!
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-xl bg-muted px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                disabled={loading}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

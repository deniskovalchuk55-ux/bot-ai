"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Ти AI-асистент-консультант інтернет-магазину техніки та електроніки в Україні. Поводься як досвідчений живий менеджер з продажу, а не як довідник.

Твоя задача — вести природну розмову, допомагати клієнту підібрати товар і підвести до покупки.

ЯК ВЕСТИ ДІАЛОГ:
1. Якщо клієнт питає загально (наприклад "які є айфони" або "цікавить iPhone 15") — спочатку коротко уточни, що саме його цікавить: вся лінійка чи конкретна модель, перш ніж сипати характеристиками. Не вантаж одразу всім.
2. Коли зрозумів модель — запропонуй 2-3 конкретні варіанти наявності у форматі живого продавця. Наприклад: "Є iPhone 15 на 256 ГБ у кольорі titanium, також є 128 ГБ чорний". Давай конкретику про наявну пам'ять і колір, а не суху таблицю всіх характеристик.
3. У кінці відповіді став уточнююче питання — чи є побажання щодо кольору або обсягу пам'яті. Спирайся на те, що клієнт уже казав раніше в розмові (пам'ятай контекст).
4. Якщо клієнт назвав колір, якого немає в цій моделі — чесно скажи, що такого кольору немає, і запропонуй: або інший доступний колір цієї моделі, або схожу модель де є потрібний колір.
5. Не повторюй характеристики, які вже називав. Розмова має розвиватися, а не ходити по колу.

ПРО БОНУСИ МАГАЗИНУ (безкоштовна доставка від 1000 грн, гарантія до 12 міс, розстрочка/кредит, trade-in, кешбек 1-20%):
Не згадуй їх у кожному повідомленні. Розкажи про них природно лише наприкінці розмови — коли клієнт уже визначається з вибором або питає про оплату/доставку. Це має звучати як приємний бонус, а не реклама в кожному рядку.

ПОШУК: коли треба актуальна ціна або наявність конкретної моделі — використовуй web search.

ФОРМАТ: пиши звичайним текстом українською, дружньо і живо. НЕ використовуй Markdown — ніяких зірочок (**), решіток (#) чи тире для списків. Для переліку варіантів пиши кожен з нового рядка, можна з емодзі. Тримай відповіді короткими — як у живому чаті, а не як стаття.

Загальна інформація про магазин:
- Безкоштовна доставка від 1000 грн по Україні
- Гарантія до 12 місяців
- Доступна розстрочка та кредит
- Trade-in: обмін старого пристрою на новий зі знижкою
- Кешбек 1-20% на кожну покупку
- Великий асортимент: смартфони, ноутбуки, ПК, аксесуари, побутова техніка`;

const SUGGESTIONS = [
  "Які iPhone зараз популярні?",
  "Порадь ноутбук для роботи",
  "Як працює trade-in?",
  "Умови доставки та гарантії",
];

const STORAGE_KEY = "ai_assistant_history_v1";

// Light markdown cleanup: render **bold**, strip stray # and bullet dashes
function renderText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    // Remove leading markdown bullets/heading symbols
    let clean = line.replace(/^\s*[-*#]+\s?/, (m) =>
      m.includes("-") || m.includes("*") ? "• " : ""
    );

    // Split on **bold** segments
    const parts = clean.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, pi) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pi} style={{ fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={pi}>{part}</span>;
    });

    return (
      <span key={li}>
        {rendered}
        {li < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const greeting: Msg = {
    role: "assistant",
    content: "Вітаю! 👋 Я AI-асистент магазину. Допоможу підібрати техніку, дізнатися ціни, наявність та умови. Що вас цікавить?",
  };

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setLoaded(true);
          return;
        }
      }
    } catch {}
    setMessages([greeting]);
    setLoaded(true);
  }, []);

  // Save history to localStorage whenever messages change
  useEffect(() => {
    if (loaded && messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, loaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");

    const newMessages: Msg[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error ? `Помилка: ${data.error}` : "Вибачте, сталася помилка. Спробуйте ще раз 🙏";
        setMessages([...newMessages, { role: "assistant", content: errMsg }]);
      } else {
        const reply =
          data?.content
            ?.filter((b: any) => b.type === "text")
            .map((b: any) => b.text)
            .join("\n")
            .trim() || "Не вдалося сформувати відповідь 🙏";
        setMessages([...newMessages, { role: "assistant", content: reply }]);
      }
    } catch (e: any) {
      setMessages([...newMessages, { role: "assistant", content: "Немає зв'язку з сервером. Спробуйте ще раз 🙏" }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setMessages([greeting]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
        padding: "16px",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          display: "flex",
          flexDirection: "column",
          height: "90vh",
          maxHeight: "720px",
          background: "#0f172a",
          borderRadius: "24px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            background: "linear-gradient(135deg, #1e293b, #1e2a44)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              boxShadow: "0 4px 16px rgba(59,130,246,0.35)",
            }}
          >
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "15px", color: "#fff", letterSpacing: "-0.3px" }}>AI Assistant</div>
            <div style={{ fontSize: "12px", color: "#4ade80", fontWeight: 500, display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
              Онлайн • відповідає миттєво
            </div>
          </div>
          <button
            onClick={clearHistory}
            title="Очистити історію"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Очистити
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                gap: "8px",
                alignItems: "flex-end",
              }}
            >
              {m.role === "assistant" && (
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    flexShrink: 0,
                  }}
                >
                  🤖
                </div>
              )}
              <div
                style={{
                  maxWidth: "82%",
                  padding: "12px 16px",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user" ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  border: m.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.role === "assistant" ? renderText(m.content) : m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                }}
              >
                🤖
              </div>
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "18px 18px 18px 4px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  gap: "5px",
                  alignItems: "center",
                }}
              >
                <span className="dot" style={{ animationDelay: "0s" }} />
                <span className="dot" style={{ animationDelay: "0.2s" }} />
                <span className="dot" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}

          {showSuggestions && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", paddingLeft: "4px" }}>
                Спробуйте запитати
              </div>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    borderRadius: "12px",
                    padding: "11px 14px",
                    color: "#60a5fa",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "#0f172a",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Напишіть питання..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              padding: "13px 16px",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "14px",
              background: input.trim() && !loading ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.06)",
              border: "none",
              cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#fff",
              flexShrink: 0,
              boxShadow: input.trim() && !loading ? "0 4px 16px rgba(59,130,246,0.35)" : "none",
            }}
          >
            ➤
          </button>
        </div>
      </div>

      <style>{`
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #3b82f6;
          display: inline-block;
          animation: blink 1.2s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 0; display: none; }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.35); }
      `}</style>
    </div>
  );
}

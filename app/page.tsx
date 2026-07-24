"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Role = "first" | "second";
type Tab = "home" | "notes" | "wishes" | "settings";

type CoupleData = {
  settings: {
    startDate: string;
    nextMeeting: string;
    firstName: string;
    secondName: string;
  };
  statuses: Array<{
    role: Role;
    emoji: string;
    label: string;
    updatedAt: string;
  }>;
  pokesToday: number;
  messages: Array<{
    id: number;
    author: Role;
    content: string;
    createdAt: string;
  }>;
  wishes: Array<{
    id: number;
    title: string;
    author: Role;
    completed: boolean;
  }>;
};

const moods = [
  { emoji: "🌤️", label: "心情不错" },
  { emoji: "💭", label: "正在想你" },
  { emoji: "🫧", label: "有点累了" },
  { emoji: "🌙", label: "需要抱抱" },
];

function daysBetween(date: string, now = new Date()) {
  const start = new Date(`${date}T00:00:00`);
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
}

function daysUntil(date: string, now = new Date()) {
  const target = new Date(`${date}T00:00:00`);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));
}

function relativeTime(date: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(`${date.replace(" ", "T")}Z`).getTime()) / 60000),
  );
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
  return `${Math.floor(minutes / 1440)}天前`;
}

export default function Home() {
  const [code, setCode] = useState("");
  const [role, setRole] = useState<Role>("first");
  const [entered, setEntered] = useState(false);
  const [data, setData] = useState<CoupleData | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [wish, setWish] = useState("");
  const [toast, setToast] = useState("");

  const name = data
    ? role === "first"
      ? data.settings.firstName
      : data.settings.secondName
    : "我";
  const partnerName = data
    ? role === "first"
      ? data.settings.secondName
      : data.settings.firstName
    : "他";

  const request = useCallback(
    async (body?: Record<string, unknown>) => {
      const response = await fetch("/api/couple", {
        method: body ? "POST" : "GET",
        headers: {
          "content-type": "application/json",
          "x-couple-code": code,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "暂时无法连接");
      return result;
    },
    [code],
  );

  const loadData = useCallback(async () => {
    const result = await request();
    setData(result);
  }, [request]);

  useEffect(() => {
    const savedCode = window.localStorage.getItem("two-planets-code");
    const savedRole = window.localStorage.getItem("two-planets-role") as Role | null;
    if (savedCode) setCode(savedCode);
    if (savedRole === "first" || savedRole === "second") setRole(savedRole);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!entered) return;
    const timer = window.setInterval(() => loadData().catch(() => undefined), 30000);
    return () => window.clearInterval(timer);
  }, [entered, loadData]);

  const enter = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loadData();
      window.localStorage.setItem("two-planets-code", code);
      window.localStorage.setItem("two-planets-role", role);
      setEntered(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "进入失败");
    } finally {
      setLoading(false);
    }
  };

  const mutate = async (body: Record<string, unknown>, success: string) => {
    setLoading(true);
    try {
      const result = await request(body);
      setData(result);
      setToast(success);
      window.setTimeout(() => setToast(""), 2200);
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  const ownStatus = data?.statuses.find((item) => item.role === role);
  const partnerStatus = data?.statuses.find((item) => item.role !== role);
  const relationshipDays = useMemo(
    () => (data ? daysBetween(data.settings.startDate) : 0),
    [data],
  );
  const meetingDays = useMemo(
    () => (data ? daysUntil(data.settings.nextMeeting) : 0),
    [data],
  );

  if (!entered || !data) {
    return (
      <main className="welcome">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <section className="welcome-card">
          <div className="brand-mark" aria-hidden="true">
            <span>●</span>
            <span>●</span>
          </div>
          <p className="eyebrow">TWO PLANETS · ONE HOME</p>
          <h1>两颗星球</h1>
          <p className="welcome-copy">
            不管相隔多远，我们都在同一个小宇宙里。
          </p>
          <form onSubmit={enter}>
            <label htmlFor="secret">我们的暗号</label>
            <input
              id="secret"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="输入只有你们知道的暗号"
              autoComplete="current-password"
              required
            />
            <fieldset>
              <legend>今天是谁来到这里？</legend>
              <div className="role-picker">
                <button
                  className={role === "first" ? "selected" : ""}
                  type="button"
                  onClick={() => setRole("first")}
                >
                  <span>☀️</span>我是星球 A
                </button>
                <button
                  className={role === "second" ? "selected" : ""}
                  type="button"
                  onClick={() => setRole("second")}
                >
                  <span>🌙</span>我是星球 B
                </button>
              </div>
            </fieldset>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "正在连接…" : "进入我们的小宇宙"}
            </button>
          </form>
          <p className="privacy-note">只有知道暗号的人才能进入</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {toast && <div className="toast">{toast}</div>}
      <header className="topbar">
        <div>
          <p className="eyebrow">OUR LITTLE UNIVERSE</p>
          <h1>晚上好，{name}</h1>
        </div>
        <button
          className="avatar-button"
          type="button"
          aria-label="切换身份"
          onClick={() => {
            setEntered(false);
            setData(null);
          }}
        >
          {role === "first" ? "☀️" : "🌙"}
        </button>
      </header>

      {tab === "home" && (
        <section className="content">
          <article className="hero-card">
            <div className="hero-copy">
              <span>我们已经在一起</span>
              <strong>{relationshipDays}</strong>
              <span>天</span>
            </div>
            <div className="stars" aria-hidden="true">✦ · ✧ · ✦</div>
            <p>距离下次见面还有 <b>{meetingDays}</b> 天</p>
          </article>

          <div className="section-heading">
            <div>
              <span>此刻的我们</span>
              <small>轻轻告诉对方，你现在怎么样</small>
            </div>
          </div>

          <div className="status-grid">
            <article className="status-card own">
              <span className="status-emoji">{ownStatus?.emoji ?? "🌤️"}</span>
              <p>{name}</p>
              <strong>{ownStatus?.label ?? "等待更新"}</strong>
              <button type="button" onClick={() => setTab("settings")}>更新状态</button>
            </article>
            <article className="status-card partner">
              <span className="status-emoji">{partnerStatus?.emoji ?? "🌙"}</span>
              <p>{partnerName}</p>
              <strong>{partnerStatus?.label ?? "还没有更新"}</strong>
              <small>{partnerStatus ? relativeTime(partnerStatus.updatedAt) : "等待他的消息"}</small>
            </article>
          </div>

          <button
            className="miss-you"
            disabled={loading}
            type="button"
            onClick={() => mutate({ type: "poke", role }, `已经把想念送给${partnerName}`)}
          >
            <span className="heart">♥</span>
            <span>
              <strong>想你了</strong>
              <small>今天已经互相想念 {data.pokesToday} 次</small>
            </span>
          </button>

          <div className="section-heading row">
            <div>
              <span>最近的留言</span>
              <small>每句话都会被好好收着</small>
            </div>
            <button type="button" onClick={() => setTab("notes")}>全部</button>
          </div>

          <div className="message-preview">
            {data.messages.slice(0, 2).map((item) => (
              <article key={item.id}>
                <span>{item.author === "first" ? "☀️" : "🌙"}</span>
                <div>
                  <strong>{item.author === role ? name : partnerName}</strong>
                  <p>{item.content}</p>
                  <small>{relativeTime(item.createdAt)}</small>
                </div>
              </article>
            ))}
            {!data.messages.length && <p className="empty">第一句温柔的话，等你来写。</p>}
          </div>
        </section>
      )}

      {tab === "notes" && (
        <section className="content subpage">
          <div className="page-title">
            <p className="eyebrow">OUR NOTES</p>
            <h2>写给彼此的话</h2>
            <span>普通的一天，也值得留下几句话。</span>
          </div>
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (!message.trim()) return;
              mutate({ type: "message", role, content: message }, "留言已经收好");
              setMessage("");
            }}
          >
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`想对${partnerName}说点什么…`}
              maxLength={240}
            />
            <button type="submit" disabled={loading || !message.trim()}>留下这句话</button>
          </form>
          <div className="timeline">
            {data.messages.map((item) => (
              <article key={item.id}>
                <div className="timeline-dot">{item.author === "first" ? "☀️" : "🌙"}</div>
                <div>
                  <small>{relativeTime(item.createdAt)}</small>
                  <p>{item.content}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "wishes" && (
        <section className="content subpage">
          <div className="page-title">
            <p className="eyebrow">OUR WISH LIST</p>
            <h2>以后一起完成</h2>
            <span>把“有一天”慢慢变成“这一天”。</span>
          </div>
          <form
            className="wish-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!wish.trim()) return;
              mutate({ type: "wish", role, title: wish }, "心愿已经加入");
              setWish("");
            }}
          >
            <input
              value={wish}
              onChange={(event) => setWish(event.target.value)}
              placeholder="比如：一起去看海"
              maxLength={80}
            />
            <button type="submit" disabled={loading || !wish.trim()}>＋</button>
          </form>
          <div className="wish-list">
            {data.wishes.map((item, index) => (
              <button
                key={item.id}
                className={item.completed ? "done" : ""}
                type="button"
                onClick={() => mutate({ type: "toggleWish", id: item.id }, item.completed ? "重新放回心愿单" : "一起完成了一件事")}
              >
                <span className="wish-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="check">{item.completed ? "✓" : ""}</span>
                <strong>{item.title}</strong>
                <small>{item.author === "first" ? "☀️" : "🌙"}</small>
              </button>
            ))}
            {!data.wishes.length && <p className="empty">写下第一件想一起完成的事吧。</p>}
          </div>
        </section>
      )}

      {tab === "settings" && (
        <section className="content subpage">
          <div className="page-title">
            <p className="eyebrow">RIGHT NOW</p>
            <h2>更新我的状态</h2>
            <span>让对方安心，也让想念有回音。</span>
          </div>
          <div className="mood-list">
            {moods.map((mood) => (
              <button
                key={mood.label}
                className={ownStatus?.label === mood.label ? "active" : ""}
                type="button"
                onClick={() => mutate({ type: "status", role, ...mood }, "状态已经更新")}
              >
                <span>{mood.emoji}</span>
                <strong>{mood.label}</strong>
                <small>{ownStatus?.label === mood.label ? "当前状态" : "选择"}</small>
              </button>
            ))}
          </div>
          <div className="install-card">
            <span>＋</span>
            <div>
              <strong>放到 iPhone 主屏幕</strong>
              <p>在 Safari 点“分享”，再选择“添加到主屏幕”。</p>
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav" aria-label="主要导航">
        {([
          ["home", "⌂", "此刻"],
          ["notes", "✎", "留言"],
          ["wishes", "☆", "心愿"],
          ["settings", "◌", "我的"],
        ] as Array<[Tab, string, string]>).map(([value, icon, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            type="button"
            onClick={() => setTab(value)}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}

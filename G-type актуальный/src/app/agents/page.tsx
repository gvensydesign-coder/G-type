"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LogLine = { t: string; m: string };
type Agent = {
  id: string;
  name: string;
  role: string;
  kind: "review" | "build";
  status: "working" | "review" | "done" | "blocked";
  now: string;
  log: LogLine[];
};

const labels = {
  working: "В работе",
  review: "Сверяет",
  done: "Готово",
  blocked: "Ждёт",
} as const;

function clock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(d);
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stamp, setStamp] = useState(0);
  const [frame, setFrame] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const res = await fetch("/api/agents", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { agents: Agent[]; patchStamp: number };
        if (stop) return;
        setAgents(data.agents);
        setStamp((prev) => {
          if (prev && data.patchStamp && data.patchStamp !== prev) setFrame((n) => n + 1);
          return data.patchStamp || prev;
        });
        setErr("");
      } catch {
        if (!stop) setErr("Лента агентов не ответила. Прототип справа остаётся открытым.");
      }
    }
    pull();
    const id = window.setInterval(pull, 2000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  const appointed = agents.filter((a) => a.kind === "review");
  const build = agents.filter((a) => a.kind === "build");

  return (
    <div className="bench">
      <aside className="bench-side">
        <div className="bench-top">
          <p className="kicker" style={{ margin: 0 }}>
            Окно сборки
          </p>
          <Link className="bench-back" href="/">
            Обзор
          </Link>
        </div>
        <h1>Агенты</h1>
        <p className="bench-lead">
          Справа живой сервис v96. Слева двое назначенных и две сборки, которые
          они проверяют.
        </p>
        {err ? <p className="bench-lead">{err}</p> : null}
        {appointed.map((agent) => (
          <AgentCard key={agent.id} agent={agent} lead />
        ))}
        {build.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </aside>
      <section className="bench-stage">
        <iframe key={frame} title="G-type v96" src="/g-type-v96.html" />
        <div className="bench-bar">
          <span>Сервис v96</span>
          <span>{frame ? `Прототип обновлён, шаг ${frame}` : "Жду правки в прототипе"}</span>
        </div>
      </section>
    </div>
  );
}

function AgentCard({ agent, lead }: { agent: Agent; lead?: boolean }) {
  return (
    <article className={lead ? "agent head" : "agent"}>
      <div className="who">
        <h2>{agent.name}</h2>
        <span className={`tag ${agent.status === "done" ? "done" : agent.status === "blocked" ? "stop" : "wait"}`}>
          {labels[agent.status]}
        </span>
      </div>
      <p className="role">{agent.role}</p>
      <p className="now">{agent.now}</p>
      <ol>
        {agent.log.slice(-4).map((line) => (
          <li key={line.t + line.m}>
            <time dateTime={line.t}>{clock(line.t)} МСК</time>
            {line.m}
          </li>
        ))}
      </ol>
    </article>
  );
}

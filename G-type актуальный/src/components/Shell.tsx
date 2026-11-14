"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const links = [
  { href: "/", label: "Обзор", icon: HomeIcon },
  { href: "/system", label: "Система", icon: GridIcon },
  { href: "/work/svoi", label: "Свой шрифт", icon: PenIcon },
  { href: "/plan", label: "План", icon: ListIcon },
  { href: "/agents", label: "Сборка", icon: PulseIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("gtype-theme");
    const next = saved === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("gtype-theme", next);
  }

  const bench = path.startsWith("/agents");
  const bare = path.startsWith("/work/") || bench;

  return (
    <div className="shell">
      {bench ? null : <aside className="rail">
        <Link href="/" className="rail-mark" aria-label="G-type">
          G<i />
        </Link>
        <nav>
          {links.map((item) => {
            const on =
              item.href === "/"
                ? path === "/"
                : path === item.href || path.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} data-on={on} aria-label={item.label}>
                <Icon />
                <span className="tip">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="rail-spacer" />
        <button className="rail-btn" type="button" onClick={toggleTheme} aria-label="Тема">
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
          <span className="tip">{theme === "light" ? "Тёмная тема" : "Светлая тема"}</span>
        </button>
      </aside>}
      <div className={bench ? "bench-page" : bare ? "frame-page" : "stage"}>{children}</div>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 11.2 12 4.2l8 7" />
      <path d="M6.2 9.6v9.9h4.2v-5.4h3.2v5.4h4.2V9.6" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1.8" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.8" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.8" />
      <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.8" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20 5 15.8 16 4.8l3.2 3.2L8.2 19z" />
      <path d="m13.8 7 3.2 3.2" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12h4l2.2-5 3.6 10 2.2-5H21" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  );
}

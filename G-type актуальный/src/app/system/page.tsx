"use client";

import { useEffect, useState } from "react";
import { previews } from "@/lib/catalog";

export default function SystemPage() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return (
    <main className="wrap">
      <p className="kicker">Снимок v40 и слой 14 ноября 2026</p>
      <h1>Система</h1>
      <p className="lead">
        Превью компонентов. Тема переключается вместе с рейлом. Поздние
        правила страницы v96 подключены файлом later.css: чёрный рейл,
        чернильные ползунки и флажки, кнопка на цвете нажатия.
      </p>
      <div className="previews">
        {previews.map(([id, title, text]) => (
          <article key={id} className="preview">
            <header>
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </header>
            <iframe
              title={title}
              src={`/design-system/components/${id}/preview.html?theme=${theme}`}
            />
          </article>
        ))}
      </div>
    </main>
  );
}

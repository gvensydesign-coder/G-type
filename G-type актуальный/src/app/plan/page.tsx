import { plan } from "@/lib/catalog";

const labels = {
  wait: "На согласование",
  done: "Уже решено",
  stop: "Остановлено",
} as const;

export default function PlanPage() {
  return (
    <main className="wrap">
      <p className="kicker">Состояние на 14 ноября 2026</p>
      <h1>План</h1>
      <p className="lead">
        Первые три пункта этого захода уже в сервисе: акцент, искажение в
        файле и в рейле редактора, четыре оси вариативного шрифта. Ниже —
        что сделано, что остановлено и что ждёт материалов.
      </p>
      {plan.map((group) => (
        <section key={group.title} className="plan-block">
          <h2>{group.title}</h2>
          <p className="lead" style={{ marginTop: 0 }}>
            {group.intro}
          </p>
          {group.items.map((item) => (
            <article key={item.title} className="item">
              <span className={`tag ${item.tag}`}>{labels[item.tag]}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}

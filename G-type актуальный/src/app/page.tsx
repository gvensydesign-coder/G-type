import Link from "next/link";
import { pieces } from "@/lib/catalog";

export default function HomePage() {
  return (
    <main className="wrap">
      <p className="kicker">Параметрическая шрифтовая платформа</p>
      <h1>Собери свой шрифт</h1>
      <p className="lead">
        Файл версии 96 разобран и открывается целиком: библиотека, редактор,
        свой шрифт, бумага и сообщество. Студия рядом хранит ранние прототипы,
        систему и план.
      </p>
      <div className="row">
        <Link className="btn pri" href="/agents">
          Окно сборки
        </Link>
        <a className="btn" href="/g-type-v96.html">
          Сервис v96
        </a>
        <Link className="btn" href="/system">
          Дизайн-система
        </Link>
        <Link className="btn" href="/plan">
          План на согласование
        </Link>
      </div>

      <section className="section">
        <h2>Что можно открыть</h2>
        <div className="grid">
          {Object.values(pieces).map((piece) => (
            <Link key={piece.href} className="card" href={piece.href}>
              <span className="meta">{piece.when}</span>
              <h2>{piece.title}</h2>
              <p>{piece.text}</p>
            </Link>
          ))}
          <Link className="card" href="/system">
            <span className="meta">27 октября 2026, 11:42 МСК</span>
            <h2>Дизайн-система v40</h2>
            <p>
              Токены октября и 14 превью. Превью подключают поздний слой:
              чёрный рейл, чернильные ползунки и флажки, главная кнопка
              на цвете нажатия страницы.
            </p>
          </Link>
        </div>
      </section>

      <section className="section">
        <h2>Что внутри файла</h2>
        <div className="note">
          <p>
            Это один HTML на 1,8 МБ. Скрипты упакованы и распаковываются при
            открытии. В каталоге 19 гарнитур, 36 языков, редактор со скелетом,
            кернингом и вариантами букв, четыре шага «Свой шрифт», «С листа
            бумаги», уроки и профиль.
          </p>
          <p>
            «Искажение» стоит в рейле редактора и записывается в TTF, OTF, WOFF,
            WOFF2, семейство и вариативный файл. На главной этой кнопки нет.
            Гарнитур «Кисть» и «Афиша» нет: «Кисть» — инструмент рисования,
            «Афиша» — пресет «Столба». Архив исходников v94 по-прежнему отсутствует.
          </p>
        </div>
      </section>
    </main>
  );
}

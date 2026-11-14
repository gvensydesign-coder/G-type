import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap">
      <p className="kicker">404</p>
      <h1>Такой страницы нет</h1>
      <p className="lead">В студии есть обзор, система, два прототипа и план.</p>
      <div className="row">
        <Link className="btn pri" href="/">
          На обзор
        </Link>
      </div>
    </main>
  );
}

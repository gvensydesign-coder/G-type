import { notFound } from "next/navigation";
import { pieces } from "@/lib/catalog";

export function generateStaticParams() {
  return Object.keys(pieces).map((slug) => ({ slug }));
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const piece = pieces[slug as keyof typeof pieces];
  if (!piece) notFound();

  return <iframe title={piece.title} src={piece.file} />;
}

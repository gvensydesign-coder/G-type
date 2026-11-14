import type { Metadata } from "next";
import { Onest } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "G-type",
  description:
    "Восстановленные куски сервиса G-type: прототипы, дизайн-система v40 и план незаконченной работы.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-theme="light">
      <head>
        <link rel="stylesheet" href="/design-system/tokens.css" />
      </head>
      <body className={onest.className}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

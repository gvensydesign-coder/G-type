import type { Metadata } from "next";
import localFont from "next/font/local";
import { Shell } from "@/components/Shell";
import "./globals.css";

const onest = localFont({
  src: "./fonts/Onest.ttf",
  weight: "100 900",
  display: "swap",
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

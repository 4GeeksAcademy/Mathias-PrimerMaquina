import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIngIA",
  description: "Aplicacion de chat con IA en Next.js, React, TypeScript y Tailwind",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

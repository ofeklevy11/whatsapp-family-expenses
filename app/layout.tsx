import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { ThemeInit } from "@/components/ds/theme";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Davidovici Expenses · הוצאות משפחה",
  description: "ניהול וניתוח הוצאות משפחתי דרך WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" data-theme="dark" className={heebo.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}

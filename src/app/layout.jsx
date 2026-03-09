import "../style/style_home.scss";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata = {
  title: "Jasur IELTS — Mock Tests",
  description:
    "Пробные IELTS тесты с учителем Джасуром: формат, тайминг, проверка и обратная связь.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

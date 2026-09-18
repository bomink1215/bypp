import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 한글 글리프는 unicode-range로 쪼개져 필요한 조각만 받는다. 미리 받는 건 라틴뿐이다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "오늘 뭐 먹지?",
  description: "지금 여기서, 딱 맞는 한 끼. 근처에 파는 곳이 있는 메뉴만 골라드려요.",
};

export const viewport: Viewport = {
  themeColor: "#fff6ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

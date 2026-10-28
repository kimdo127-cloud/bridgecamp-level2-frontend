import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ChatWidget } from "@/components/chat-widget";
import "./globals.css";

export const metadata: Metadata = {
  title: "브릿지캠프 · 수강 신청",
  description: "브릿지캠프의 IT·AI 교육 과정과 모집 기수를 한눈에 확인하세요.",
  appleWebApp: { capable: true, title: "브릿지캠프", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f6fa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        <div className="relative mx-auto min-h-dvh w-full max-w-md bg-surface shadow-[0_0_40px_rgba(24,27,43,0.08)]">
          {children}
          <Suspense fallback={null}>
            <ChatWidget />
          </Suspense>
        </div>
      </body>
    </html>
  );
}

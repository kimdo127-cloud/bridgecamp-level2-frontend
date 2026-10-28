import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "브릿지캠프 IT·AI 교육 과정",
    short_name: "브릿지캠프",
    description: "브릿지캠프의 교육 과정과 모집 기수",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fa",
    theme_color: "#f5f6fa",
    lang: "ko",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

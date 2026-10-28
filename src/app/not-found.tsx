import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 text-5xl" aria-hidden>
        🧭
      </div>
      <p className="text-lg font-bold">페이지를 찾을 수 없어요</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">주소가 바뀌었거나 없는 페이지예요.</p>
      <Link href="/" className="mt-6 flex h-13 w-full max-w-60 items-center justify-center rounded-2xl bg-brand-600 font-semibold text-white">
        과정 목록으로
      </Link>
    </main>
  );
}

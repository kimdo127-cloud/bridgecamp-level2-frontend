"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdminBar, CategoryThumb, PreviewBar, FlashToast, Skeleton, SlowServerHint, StatusScreen, UserMenu, primaryButton, type Mode } from "@/components/ui";
import { courseGroup, listCourses, openCohorts, type CourseGroup } from "@/lib/api";
import { cohortStatusLabel, deadlineLabel, formatDot, formatPrice, weeksLabel } from "@/lib/format";
import { CATEGORIES, FORMATS, type CourseFilter, type CourseWithCohorts } from "@/lib/types";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; courses: CourseWithCohorts[] };

const GROUPS: { key: CourseGroup; title: string; desc: string }[] = [
  { key: "closing", title: "🔥 마감 임박", desc: "신청 마감까지 일주일도 안 남았어요" },
  { key: "open", title: "모집 중인 과정", desc: "개강이 가까운 순서예요" },
  { key: "preparing", title: "다음 기수 준비 중", desc: "일정이 정해지면 이곳에 안내해 드려요" },
];

// 사용자 모드(/)와 운영 모드(/admin)가 같은 목록을 쓰고, 운영 모드에만 관리 버튼이 붙는다
export function CourseList({ mode }: { mode: Mode }) {
  const admin = mode === "admin";
  const [state, setState] = useState<State>({ status: "loading" });
  const [filter, setFilter] = useState<CourseFilter>({});
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const requestNo = useRef(0);
  const filtering = Boolean(filter.q || filter.category || filter.format);

  // 검색어는 입력을 멈추고 0.3초 뒤에 백엔드로 보낸다
  useEffect(() => {
    const t = setTimeout(() => setFilter((f) => (f.q === query.trim() ? f : { ...f, q: query.trim() || undefined })), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 검색·필터가 바뀔 때마다 백엔드에서 다시 받아 온다 (늦게 도착한 이전 응답은 버린다)
  useEffect(() => {
    const no = ++requestNo.current;
    listCourses(filter)
      .then((courses) => no === requestNo.current && setState({ status: "ready", courses }))
      .catch(() => no === requestNo.current && setState({ status: "error" }));
  }, [filter, reloadKey]);

  const load = () => {
    setState({ status: "loading" });
    setReloadKey((k) => k + 1);
  };
  const clearFilter = () => {
    setQuery("");
    setFilter({});
  };

  return (
    <main className={admin ? "pb-32" : "pb-10"}>
      <FlashToast />
      {!admin && <PreviewBar adminHref="/admin" />}
      {admin ? (
        <AdminBar userHref="/" nav="/admin" />
      ) : (
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line/70 bg-surface/90 px-5 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white" aria-hidden>
            B
          </span>
          <p className="text-[17px] font-extrabold tracking-tight">브릿지캠프</p>
        </div>
        <UserMenu />
      </header>
      )}

      {!admin && (
        <section className="px-5 pt-5">
          <h1 className="text-[22px] font-bold leading-snug">어떤 과정을 찾고 계세요?</h1>
          <p className="mt-1 text-sm text-ink-soft">개강일, 기간, 수업 방식, 수강료를 한눈에 비교해 보세요.</p>
        </section>
      )}

      <FilterBar query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} />

      {state.status === "loading" && <SlowServerHint />}
      {state.status === "loading" && (
        <ul className="mt-6 space-y-2.5 px-5" aria-busy="true" aria-label="과정을 불러오는 중">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-white p-3">
              <Skeleton className="h-[92px] w-[92px] rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-4 h-3 w-36" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.status === "error" && (
        <StatusScreen
          emoji="🔌"
          title="과정을 불러오지 못했어요"
          body={"서버와 연결이 잠시 끊겼어요.\n잠시 뒤 다시 시도해 주세요."}
          action={
            <button type="button" onClick={load} className={primaryButton}>
              다시 불러오기
            </button>
          }
        />
      )}

      {state.status === "ready" && state.courses.length === 0 && filtering && (
        <StatusScreen
          emoji="🔎"
          title="조건에 맞는 과정이 없어요"
          body={"검색어를 바꾸거나 필터를 풀어 보세요.\n궁금한 점은 오른쪽 아래 상담 챗봇에게 물어봐도 돼요."}
          action={
            <button type="button" onClick={clearFilter} className={primaryButton}>
              전체 과정 보기
            </button>
          }
        />
      )}

      {state.status === "ready" && filtering && state.courses.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-5 text-[13px]">
          <p className="text-ink-soft">
            검색 결과 <b className="text-ink">{state.courses.length}개</b>
          </p>
          <button type="button" onClick={clearFilter} className="font-semibold text-brand-600 active:opacity-60">
            조건 지우기
          </button>
        </div>
      )}

      {state.status === "ready" && state.courses.length === 0 && !filtering && (
        <StatusScreen
          emoji="📚"
          title={admin ? "아직 등록된 과정이 없어요" : "지금 열린 과정이 없어요"}
          body={admin ? "첫 번째 과정을 등록해 보세요." : "새 과정이 열리면 이곳에 안내해 드릴게요."}
          action={
            admin && (
              <Link href="/admin/courses/new" className={primaryButton}>
                과정 등록하기
              </Link>
            )
          }
        />
      )}

      {state.status === "ready" &&
        GROUPS.map((g) => {
          const items = state.courses.filter((c) => courseGroup(c) === g.key);
          if (items.length === 0) return null;
          return (
            <section key={g.key} className="mt-6 px-5">
              <div className="mb-3">
                <h2 className="text-lg font-bold">
                  {g.title} <span className="text-brand-600">{items.length}</span>
                </h2>
                <p className="text-[13px] text-ink-soft">{g.desc}</p>
              </div>
              <ul className="space-y-2.5">
                {items.map((c) => (
                  <li key={c.id}>
                    <CourseCard item={c} group={g.key} admin={admin} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

      {admin && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md justify-end px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <Link
            href="/admin/courses/new"
            className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-ink pr-6 pl-5 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(24,27,43,0.3)] active:scale-95"
          >
            <span className="text-xl leading-none" aria-hidden>
              +
            </span>
            과정 등록
          </Link>
        </div>
      )}
    </main>
  );
}

// 가로형 목록 카드: 사진을 왼쪽에 작게 두고, 결정에 필요한 정보(상태·개강·기간·수강료)만 담아 한 화면에 4~5개가 보이게 한다
function CourseCard({ item, group, admin }: { item: CourseWithCohorts; group: CourseGroup; admin: boolean }) {
  const next = openCohorts(item)[0];
  const preparing = group === "preparing";

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(24,27,43,0.06)]">
      <Link
        href={admin ? `/admin/courses/${item.id}` : `/courses/${item.id}`}
        className={`flex gap-3 p-3 transition active:bg-surface ${preparing && !admin ? "opacity-70" : ""}`}
      >
        <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-xl">
          <CategoryThumb category={item.category} src={item.thumbnail} size="fill" />
          <div className="absolute top-1.5 left-1.5">
            {preparing ? (
              <Badge tone="gray">준비 중</Badge>
            ) : (
              <Badge tone={group === "closing" ? "red" : "green"}>{group === "closing" ? "마감 임박" : "모집 중"}</Badge>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[12px] text-ink-soft">
            {item.category} · {item.level} · {item.format}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug">{item.title}</p>
          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
            <p className="min-w-0 truncate text-[12px]">
              {next ? (
                <>
                  <span className={`font-semibold ${group === "closing" ? "text-[#c23b3b]" : "text-moss-600"}`}>{group === "closing" ? deadlineLabel(next.applyDeadline) : cohortStatusLabel(next)}</span>
                  <span className="text-ink-soft">
                    {" "}
                    · {formatDot(next.startDate)} · {weeksLabel(next.startDate, next.endDate)}
                  </span>
                </>
              ) : (
                <span className="text-ink-soft">다음 기수 준비 중</span>
              )}
            </p>
            <p className="shrink-0 text-[15px] font-extrabold text-brand-700">{formatPrice(item.price)}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function Badge({ tone, children }: { tone: "green" | "red" | "dark" | "gray"; children: React.ReactNode }) {
  const tones = {
    green: "bg-moss-600 text-white",
    red: "bg-[#e5484d] text-white",
    dark: "bg-ink/80 text-white",
    gray: "bg-white/90 text-ink-soft",
  };
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold backdrop-blur ${tones[tone]}`}>{children}</span>;
}

// 검색창과 분야·수업 방식 필터. 고른 조건은 백엔드가 걸러서 돌려준다
function FilterBar({
  query,
  onQuery,
  filter,
  onFilter,
}: {
  query: string;
  onQuery: (q: string) => void;
  filter: CourseFilter;
  onFilter: (f: CourseFilter) => void;
}) {
  const toggle = (key: "category" | "format", value: string) => onFilter({ ...filter, [key]: filter[key] === value ? undefined : value });
  return (
    <section className="mt-4 space-y-2.5" aria-label="과정 검색과 필터">
      <div className="px-5">
        <label htmlFor="course-search" className="sr-only">
          과정 검색
        </label>
        <div className="relative">
          <svg className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            id="course-search"
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="과정 이름, 강사로 검색 (예: SQL)"
            maxLength={40}
            className="block h-12 w-full rounded-2xl border border-line bg-white pr-4 pl-11 text-[15px] outline-none placeholder:text-[#a3a8ba] focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </div>
      <ChipRow label="분야" options={CATEGORIES} value={filter.category} onPick={(v) => toggle("category", v)} />
      <ChipRow label="방식" options={FORMATS} value={filter.format} onPick={(v) => toggle("format", v)} />
    </section>
  );
}

function ChipRow({ label, options, value, onPick }: { label: string; options: readonly string[]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-5 [scrollbar-width:none]" role="group" aria-label={`${label} 필터`}>
      <span className="shrink-0 text-[12px] font-semibold text-ink-soft">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onPick(o)}
          className={`h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold transition ${value === o ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line active:bg-brand-50"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

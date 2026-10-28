"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ApplySheet } from "@/components/apply-sheet";
import { AdminBar, BottomBar, PreviewBar, CategoryThumb, Chip, FlashToast, HomeLink, Skeleton, StatusScreen, TopBar, primaryButton, type Mode } from "@/components/ui";
import { canApply, courseGroup, getCourse, openCohorts, recordView } from "@/lib/api";
import { COMMON_FAQ } from "@/lib/faq";
import { cohortStatus, cohortStatusLabel, deadlineLabel, formatDate, formatDot, formatPrice, formatRange, todayString, weeksLabel } from "@/lib/format";
import { lines, type Cohort, type CourseWithCohorts } from "@/lib/types";

type State = { status: "loading" } | { status: "missing" } | { status: "ready"; item: CourseWithCohorts };

const TABS = [
  { id: "intro", label: "소개" },
  { id: "curriculum", label: "커리큘럼" },
  { id: "schedule", label: "일정" },
  { id: "faq", label: "FAQ" },
];

// 사용자 모드(/courses/:id)와 운영 모드(/admin/courses/:id)가 같은 상세를 쓰고, 운영 모드에만 관리 버튼이 붙는다
export function CourseDetailPage({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getCourse(Number(id))
      .then((item) => setState(item ? { status: "ready", item } : { status: "missing" }))
      .catch(() => setState((s) => (s.status === "ready" ? s : { status: "missing" })));
  }, [id, reloadKey]);

  // 수강 희망자가 상세를 본 기록 (신청 전환 현황용). 같은 탭에서 같은 과정은 한 번만 센다
  useEffect(() => {
    if (mode !== "user") return;
    const key = `bridgecamp:viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    recordView(Number(id));
  }, [id, mode]);

  if (state.status === "loading") return <DetailSkeleton />;

  if (state.status === "missing")
    return (
      <main>
        {mode === "admin" ? <AdminBar userHref="/" backHref="/admin" /> : <TopBar />}
        <StatusScreen emoji="🔍" title="찾는 과정이 없어요" body={"주소가 잘못되었거나 모집이 끝난 과정이에요.\n목록에서 다시 골라 주세요."} action={<HomeLink />} />
      </main>
    );

  return <CourseDetail c={state.item} mode={mode} onChanged={() => setReloadKey((k) => k + 1)} />;
}

function CourseDetail({ c, mode, onChanged }: { c: CourseWithCohorts; mode: Mode; onChanged: () => void }) {
  const admin = mode === "admin";
  const addCohortHref = `/admin/courses/${c.id}/cohorts/new`;
  const next = openCohorts(c)[0];
  const curriculum = lines(c.curriculum);
  const recommended = lines(c.recommendedFor);
  const cohorts = [...c.cohorts].reverse();
  const [active, setActive] = useState("intro");
  const [toast, setToast] = useState<string | null>(null);
  const [applying, setApplying] = useState<number | null>(null);
  const applyTarget = c.cohorts.find((x) => x.id === applying) ?? null;
  const firstApplicable = c.cohorts.find(canApply);


  // 스크롤 위치에 맞춰 상단 탭 강조
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    TABS.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const goTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 108, behavior: "smooth" });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: c.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast("링크를 복사했어요");
        setTimeout(() => setToast(null), 2000);
      }
    } catch {}
  };

  return (
    <main>
      <FlashToast />
      {admin ? (
        <>
          <AdminBar userHref={`/courses/${c.id}`} backHref="/admin" />
          <p className="bg-ink/5 px-5 py-2.5 text-[13px] text-ink-soft">수강 희망자에게는 기수 추가 버튼을 뺀 이 화면이 그대로 보여요.</p>
        </>
      ) : (
        <>
        <PreviewBar adminHref={`/admin/courses/${c.id}`} />
        <TopBar
        title={c.title}
        right={
          <button type="button" onClick={share} aria-label="공유하기" className="flex h-11 w-11 items-center justify-center rounded-full active:bg-brand-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" />
            </svg>
          </button>
        }
      />
        </>
      )}
      {toast && (
        <div role="status" className="fixed inset-x-0 top-20 z-50 mx-auto w-fit rounded-full bg-ink px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* 히어로 */}
      <CategoryThumb category={c.category} src={c.thumbnail} size="lg" />
      <section className="bg-white px-5 pt-5 pb-6">
        <div className="flex flex-wrap gap-1.5">
          <Chip>{c.category}</Chip>
          <Chip tone="gray">{c.level}</Chip>
          {next ? (
            courseGroup(c) === "closing" ? (
              <span className="inline-flex items-center rounded-full bg-[#fde8e8] px-2 py-0.5 text-xs font-semibold text-[#c23b3b]">마감 임박 · {cohortStatusLabel(next)}</span>
            ) : (
              <Chip tone="moss">모집 중 · {cohortStatusLabel(next)}</Chip>
            )
          ) : (
            <Chip tone="gray">다음 기수 준비 중</Chip>
          )}
        </div>
        <h2 className="mt-3 text-[23px] font-bold leading-snug">{c.title}</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{c.summary}</p>

        {/* 핵심 정보: 언제 / 얼마 / 어떻게 */}
        <dl className="mt-5 divide-y divide-line rounded-2xl border border-line">
          <KeyRow label="개강" value={next ? `${next.cohortNo}기 · ${formatDate(next.startDate)}` : "다음 기수 준비 중"} strong={Boolean(next)} />
          {next && <KeyRow label="기간" value={`${formatRange(next.startDate, next.endDate)} · ${weeksLabel(next.startDate, next.endDate)}`} />}
          {next?.schedule && <KeyRow label="수업 시간" value={next.schedule} />}
          <KeyRow label="수업 방식" value={c.format} />
          {next && <KeyRow label="신청 마감" value={`${formatDate(next.applyDeadline)} · ${deadlineLabel(next.applyDeadline)}`} />}
          <KeyRow label="정원" value={next ? `${next.capacity}명 · 남은 자리 ${next.remaining}석` : `${c.defaultCapacity}명`} />
          <KeyRow label="수강료" value={formatPrice(c.price)} strong />
        </dl>
      </section>

      {/* 섹션 이동 탭 */}
      <nav className="sticky top-14 z-10 border-b border-line bg-white/95 backdrop-blur" aria-label="상세 정보 바로가기">
        <ul className="grid grid-cols-4">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => goTo(t.id)}
                aria-current={active === t.id}
                className={`h-12 w-full border-b-2 text-[15px] font-semibold transition ${active === t.id ? "border-ink text-ink" : "border-transparent text-ink-soft"}`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-2 bg-surface">
        <Section id="intro" title="이런 분께 추천해요">
          <ul className="space-y-2.5">
            {recommended.map((r) => (
              <li key={r} className="flex gap-2.5 text-[15px] leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700" aria-hidden>
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <h4 className="mb-2 text-[15px] font-bold">과정 소개</h4>
            <p className="whitespace-pre-line text-[15px] leading-7 text-ink/90">{c.description}</p>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-surface p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl" aria-hidden>
              🧑‍🏫
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold">{c.instructorName} 강사</p>
              {c.instructorBio && <p className="text-[13px] text-ink-soft">{c.instructorBio}</p>}
            </div>
          </div>
        </Section>

        <Section id="curriculum" title={`커리큘럼 · ${curriculum.length}단계`}>
          <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-line">
            {curriculum.map((step, i) => (
              <li key={i} className="relative flex gap-3">
                <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">{i + 1}</span>
                <p className="pt-0.5 text-[15px] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          {c.preparation && (
            <div className="mt-6 rounded-2xl bg-brand-50 p-4">
              <p className="text-[14px] font-bold text-brand-700">준비 사항</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink/90">{c.preparation}</p>
            </div>
          )}
        </Section>

        <Section
          id="schedule"
          title="기수 일정"
          action={
            admin && (
              <Link href={addCohortHref} className="text-sm font-semibold text-brand-600 active:opacity-60">
                + 기수 추가
              </Link>
            )
          }
        >
          {cohorts.length === 0 ? (
            <p className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-ink-soft">아직 열린 기수가 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {cohorts.map((x) => {
                const status = cohortStatus(x);
                return (
                  <li key={x.id} className={`rounded-2xl border px-4 py-3.5 ${status === "upcoming" ? "border-brand-200 bg-brand-50/60" : "border-line"} ${status === "ended" ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[15px] font-bold">
                        {x.cohortNo}기
                        {/* 운영 모드에서 개강 전 기수만 수정할 수 있다 */}
                        {admin && status === "upcoming" && (
                          <Link href={`/admin/courses/${c.id}/cohorts/${x.id}/edit`} className="rounded-md bg-white px-2 py-0.5 text-[12px] font-semibold text-brand-700 ring-1 ring-brand-200 active:bg-brand-50">
                            수정
                          </Link>
                        )}
                      </p>
                      <Chip tone={status === "upcoming" && x.applyDeadline >= todayString() ? "moss" : status === "ongoing" ? "brand" : "gray"}>
                        {status !== "upcoming" ? cohortStatusLabel(x) : x.applyDeadline >= todayString() ? `모집 중 · ${cohortStatusLabel(x)}` : `신청 마감 · ${cohortStatusLabel(x)}`}
                      </Chip>
                    </div>
                    <p className="mt-1 text-[14px]">{formatRange(x.startDate, x.endDate)}</p>
                    <p className="mt-0.5 text-[13px] text-ink-soft">
                      {weeksLabel(x.startDate, x.endDate)} · 정원 {x.capacity}명{x.schedule && ` · ${x.schedule}`}
                    </p>
                    {status === "upcoming" && <CohortApplyRow cohort={x} admin={admin} onApply={() => setApplying(x.id)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section id="faq" title="자주 묻는 질문">
          <div className="divide-y divide-line">
            {COMMON_FAQ.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  <span>Q. {f.q}</span>
                  <span className="text-ink-soft transition group-open:rotate-180" aria-hidden>
                    ⌄
                  </span>
                </summary>
                <p className="pb-3 text-[14px] leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-[13px] text-ink-soft">
            더 궁금한 점은 오른쪽 아래 💬 상담 챗봇에게 물어보세요. 챗봇이 답하기 어려운 내용은 운영팀에 문의로 남길 수 있어요.
          </p>
        </Section>
      </div>

      <BottomBar>
        {admin ? (
          <div className="flex items-center gap-3">
            <Link href={`/admin/courses/${c.id}/edit`} className="flex h-13 shrink-0 items-center justify-center rounded-2xl border border-line bg-white px-4 text-[15px] font-semibold text-ink active:bg-surface">
              과정 수정
            </Link>
            <Link href={addCohortHref} className={primaryButton}>
              + 기수 추가
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-[12px] text-ink-soft">{firstApplicable ? `${firstApplicable.cohortNo}기 · 남은 자리 ${firstApplicable.remaining}석` : next ? "정원 마감" : "다음 기수 준비 중"}</p>
              <p className="text-lg font-extrabold">{formatPrice(c.price)}</p>
            </div>
            {/* 신청할 수 있는 가장 빠른 기수로 바로 신청한다. 다른 기수는 기수 일정에서 고른다 */}
            <button type="button" onClick={() => firstApplicable && setApplying(firstApplicable.id)} disabled={!firstApplicable} className={primaryButton}>
              {firstApplicable ? "수강 신청하기" : next ? "정원 마감" : "모집 예정"}
            </button>
          </div>
        )}
      </BottomBar>
      {applyTarget && <ApplySheet course={c} cohort={applyTarget} onClose={() => setApplying(null)} onApplied={onChanged} />}
    </main>
  );
}

// 개강 전 기수 아래: 남은 자리·신청 마감과 신청 버튼 (운영 모드에서는 신청 현황만)
function CohortApplyRow({ cohort: x, admin, onApply }: { cohort: Cohort; admin: boolean; onApply: () => void }) {
  const closed = x.applyDeadline < todayString();
  const full = x.remaining === 0;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-brand-100 pt-3">
      <p className="text-[13px]">
        {admin ? (
          <span className="font-semibold">
            신청 {x.appliedCount}명 / {x.capacity}명
          </span>
        ) : (
          <span className={`font-semibold ${full ? "text-[#c23b3b]" : "text-brand-700"}`}>{full ? "정원 마감" : `남은 자리 ${x.remaining}석`}</span>
        )}
        <span className="text-ink-soft"> · 신청 마감 {formatDot(x.applyDeadline)}</span>
      </p>
      {!admin && (
        <button
          type="button"
          onClick={onApply}
          disabled={closed || full}
          className="h-9 shrink-0 rounded-xl bg-brand-600 px-3.5 text-[13px] font-semibold text-white active:bg-brand-700 disabled:bg-[#d7dae6] disabled:text-ink-soft"
        >
          {closed ? "신청 마감" : full ? "마감" : "신청하기"}
        </button>
      )}
    </div>
  );
}

function KeyRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-[14px] text-ink-soft">{label}</dt>
      <dd className={`text-right text-[15px] ${strong ? "font-bold text-ink" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

function Section({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 bg-white px-5 py-7">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DetailSkeleton() {
  return (
    <main aria-busy="true">
      <TopBar />
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="space-y-3 bg-white p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-4 h-56 w-full rounded-2xl" />
      </div>
    </main>
  );
}

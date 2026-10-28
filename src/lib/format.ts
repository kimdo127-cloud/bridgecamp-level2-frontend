import type { Cohort } from "./types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatPrice(price: number) {
  return price === 0 ? "무료" : `${price.toLocaleString("ko-KR")}원`;
}

// "YYYY-MM-DD"를 시간대 영향 없이 로컬 날짜로 읽는다
export function parseDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayString() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export function formatDate(date: string) {
  const d = parseDate(date);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function formatShortDate(date: string) {
  const d = parseDate(date);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

export function daysBetween(from: string, to: string) {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export function weeksLabel(startDate: string, endDate: string) {
  const weeks = Math.ceil((daysBetween(startDate, endDate) + 1) / 7);
  return `${weeks}주`;
}

export type CohortStatus = "upcoming" | "ongoing" | "ended";

export function cohortStatus(c: Cohort): CohortStatus {
  const today = todayString();
  if (today < c.startDate) return "upcoming";
  if (today <= c.endDate) return "ongoing";
  return "ended";
}

export function cohortStatusLabel(c: Cohort) {
  const status = cohortStatus(c);
  if (status === "ongoing") return "진행 중";
  if (status === "ended") return "종료";
  const diff = daysBetween(todayString(), c.startDate);
  return diff === 1 ? "내일 개강" : `개강 D-${diff}`;
}

export function formatDot(date: string) {
  const d = parseDate(date);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

export function formatRange(startDate: string, endDate: string) {
  return `${formatDot(startDate)} – ${formatDot(endDate)}`;
}

// 신청 마감일 안내: "오늘 마감", "내일 마감", "마감 D-3"
export function deadlineLabel(date: string) {
  const diff = daysBetween(todayString(), date);
  if (diff <= 0) return "오늘 마감";
  if (diff === 1) return "내일 마감";
  return `마감 D-${diff}`;
}

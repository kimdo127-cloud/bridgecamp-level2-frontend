import { cohortStatus, daysBetween, todayString } from "./format";
import { getToken, logout } from "./auth";
import type { Application, ChatReply, Cohort, CohortInput, CourseFilter, CourseInput, CourseWithCohorts, InquiryLog, MyInquiryItem, Stats, User } from "./types";

// 백엔드(NestJS) 주소. 로컬은 .env.local, 배포는 Vercel 설정값 NEXT_PUBLIC_API_URL로 정한다.
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4200").replace(/\/$/, "");

// 백엔드가 입력을 거절하면 칸별 안내 문구(errors)를 함께 돌려준다
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Record<string, string> = {},
    readonly rule?: string,
  ) {
    super(message);
  }
}

// 로그인했다면 토큰을 함께 보낸다. 권한 확인은 백엔드가 한다
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  const token = typeof window !== "undefined" ? getToken() : null;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("서버와 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.", 0);
  }
  const body = await res.json().catch(() => ({}));
  // 토큰이 만료됐거나 리셋으로 계정이 바뀌면 로그인 정보를 지운다
  if (res.status === 401 && token) logout();
  if (!res.ok) throw new ApiError(body.message ?? "요청을 처리하지 못했어요.", res.status, body.errors, body.rule);
  return body as T;
}

// 모집 중(개강 전이고 신청 마감일이 지나지 않은) 기수, 개강이 빠른 순
export function openCohorts(c: CourseWithCohorts) {
  const today = todayString();
  return c.cohorts.filter((x) => cohortStatus(x) === "upcoming" && x.applyDeadline >= today);
}

// 지금 신청할 수 있는 기수 (모집 중이고 자리가 남음)
export function canApply(x: Cohort) {
  return cohortStatus(x) === "upcoming" && x.applyDeadline >= todayString() && x.remaining > 0;
}

export const CLOSING_SOON_DAYS = 7;

// 수강 희망자 목록의 묶음: 마감 임박(신청 마감 7일 이내) / 모집 중 / 다음 기수 준비 중
export type CourseGroup = "closing" | "open" | "preparing";

export function courseGroup(c: CourseWithCohorts): CourseGroup {
  const next = openCohorts(c)[0];
  if (!next) return "preparing";
  return daysBetween(todayString(), next.applyDeadline) <= CLOSING_SOON_DAYS ? "closing" : "open";
}

// 검색어·분야·수업 방식은 백엔드가 걸러서 돌려준다
export async function listCourses(filter: CourseFilter = {}): Promise<CourseWithCohorts[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) if (v) params.set(k, v);
  const query = params.toString();
  const list = await request<CourseWithCohorts[]>(`/courses${query ? `?${query}` : ""}`);
  // 개강이 가까운 과정이 위로, 모집 중인 기수가 없으면 맨 뒤
  const key = (c: CourseWithCohorts) => openCohorts(c)[0]?.startDate ?? "9999";
  return list.sort((a, b) => key(a).localeCompare(key(b)));
}

export async function getCourse(id: number): Promise<CourseWithCohorts | null> {
  try {
    return await request<CourseWithCohorts>(`/courses/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function createCourse(input: CourseInput): Promise<CourseWithCohorts> {
  return request<CourseWithCohorts>("/courses", { method: "POST", body: JSON.stringify(input) });
}

// 과정 정보 수정 (대표 사진 포함, 기수 제외)
export async function updateCourse(courseId: number, input: Omit<CourseInput, "cohorts">): Promise<CourseWithCohorts> {
  return request<CourseWithCohorts>(`/courses/${courseId}`, { method: "PATCH", body: JSON.stringify(input) });
}

// 기수 수정. 이미 시작한 기수는 백엔드가 거절한다
export async function updateCohort(courseId: number, cohortId: number, input: CohortInput): Promise<Cohort> {
  return request<Cohort>(`/courses/${courseId}/cohorts/${cohortId}`, { method: "PATCH", body: JSON.stringify(input) });
}

// 기수 번호는 백엔드가 그 과정의 마지막 기수 + 1로 붙여서 돌려준다
export async function addCohort(courseId: number, input: CohortInput): Promise<Cohort> {
  return request<Cohort>(`/courses/${courseId}/cohorts`, { method: "POST", body: JSON.stringify(input) });
}

// 상세 화면 조회 기록 (신청 전환 현황용). 실패해도 화면에는 영향을 주지 않는다
export function recordView(courseId: number) {
  return request(`/courses/${courseId}/views`, { method: "POST" }).catch(() => undefined);
}

export function login(loginId: string, password: string) {
  return request<{ token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ loginId, password }) });
}

// 수강 신청. 정원·중복·신청 기간 규칙에 걸리면 백엔드가 거절하고 이유를 돌려준다
export function applyCohort(cohortId: number) {
  return request<Application>("/applications", { method: "POST", body: JSON.stringify({ cohortId }) });
}

export function myApplications() {
  return request<Application[]>("/me/applications");
}

export function cancelApplication(id: number) {
  return request<Application>(`/applications/${id}/cancel`, { method: "POST" });
}

export function getStats() {
  return request<Stats>("/admin/stats");
}

export function resetData() {
  return request<{ message: string }>("/admin/reset", { method: "POST" });
}

export function getInquiryLog() {
  return request<InquiryLog>("/admin/inquiries");
}

// visitorId: 로그인 전 방문자를 묶기 위한 브라우저 방문자 ID. 로그인 상태면 백엔드가 계정으로 구분한다
export function askChat(message: string, history: { role: "user" | "assistant"; content: string }[], visitorId: string | null) {
  return request<ChatReply>("/chat", { method: "POST", body: JSON.stringify({ message, history, visitorId }) });
}

// 운영 매니저가 로그인 수강생에게 답변을 보낸다
export function replyToThread(key: string, message: string) {
  return request<{ id: number; message: string }>(`/admin/inquiries/${encodeURIComponent(key)}/replies`, { method: "POST", body: JSON.stringify({ message }) });
}

// 챗봇 창에 보여 줄 운영팀 답변 (로그인이면 계정, 아니면 이 브라우저의 방문자 ID 기준)
export function getChatReplies(visitorId: string | null) {
  return request<{ id: number; at: string; text: string }[]>(`/chat/replies${visitorId ? `?visitorId=${visitorId}` : ""}`);
}

// 내 문의와 운영팀 답변 (수강생 본인)
export function myInquiries() {
  return request<MyInquiryItem[]>("/me/inquiries");
}

export function sendInquiry(input: { message: string; chatQuestion?: string; courseId?: number }) {
  return request<{ id: number; message: string }>("/inquiries", { method: "POST", body: JSON.stringify(input) });
}

export const CATEGORIES = ["AI 활용", "데이터", "개발", "디자인", "기획·PM"] as const;
export type Category = (typeof CATEGORIES)[number];

export const LEVELS = ["입문", "초급", "중급"] as const;
export type Level = (typeof LEVELS)[number];

export const FORMATS = ["온라인", "오프라인", "하이브리드"] as const;
export type Format = (typeof FORMATS)[number];

// DB 테이블 courses 한 줄
export interface Course {
  id: number;
  title: string;
  category: Category;
  level: Level;
  format: Format;
  summary: string;
  description: string;
  price: number;
  defaultCapacity: number;
  instructorName: string;
  instructorBio: string;
  recommendedFor: string; // 한 줄에 하나씩
  curriculum: string; // 한 줄에 한 주차씩
  preparation: string;
  thumbnail: string | null; // 대표 사진 data URL. 없으면 분야 그림
  createdAt: string;
}

// DB 테이블 cohorts 한 줄 (courses 1 : N cohorts)
export interface Cohort {
  id: number;
  courseId: number;
  cohortNo: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  capacity: number;
  schedule: string;
  applyDeadline: string; // 신청 마감일 YYYY-MM-DD
  appliedCount: number; // 신청 중 인원
  remaining: number; // 남은 자리
}

export interface CourseWithCohorts extends Course {
  cohorts: Cohort[];
}

export interface CohortInput {
  startDate: string;
  endDate: string;
  capacity: number;
  schedule: string;
  applyDeadline: string; // 비우면 개강 전날
}

export type Role = "admin" | "member";

export interface User {
  id: number;
  loginId: string;
  name: string;
  role: Role;
}

// DB 테이블 applications 한 줄 (내 신청)
export interface Application {
  id: number;
  status: "applied" | "cancelled";
  createdAt: string;
  cancelledAt: string | null;
  cohort: Pick<Cohort, "id" | "cohortNo" | "startDate" | "endDate" | "schedule" | "applyDeadline">;
  course: Pick<Course, "id" | "title" | "category" | "format" | "price">;
}

export interface Stats {
  today: string;
  todayApplications: number;
  remainingSeats: number;
  closingSoonCount: number;
  closingSoon: { cohortId: number; courseId: number; courseTitle: string; cohortNo: number; applyDeadline: string; remaining: number }[];
  conversion: { courseId: number; title: string; views: number; applications: number; rate: number }[];
}

// 문의 내역의 한 줄: 사람 한 명의 대화 묶음 (로그인 = 수강생 계정, 비로그인 = 브라우저 방문자)
export type ThreadItem =
  | { type: "chat"; id: number; at: string; text: string; answer: string; needsHuman: boolean }
  | { type: "inquiry"; id: number; at: string; text: string; courseTitle: string | null }
  | { type: "reply"; id: number; at: string; text: string };

export interface Thread {
  key: string;
  kind: "member" | "visitor";
  label: string;
  lastAt: string;
  preview: string;
  count: number;
  status: "waiting" | "answered" | null;
  items: ThreadItem[];
}

export interface InquiryLog {
  retentionDays: number;
  member: Thread[];
  visitor: Thread[];
}

export interface MyInquiryItem {
  type: "inquiry" | "reply";
  id: number;
  at: string;
  text: string;
}

export interface ChatReply {
  answer: string;
  courses: { id: number; title: string; category: Category }[];
  needsHuman: boolean;
  saved: "account" | "guest";
}

export type CourseInput = Omit<Course, "id" | "createdAt"> & { cohorts: CohortInput[] };

export interface CourseFilter {
  q?: string;
  category?: string;
  format?: string;
}

export function lines(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

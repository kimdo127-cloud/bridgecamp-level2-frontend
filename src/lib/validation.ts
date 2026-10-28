import { daysBetween, todayString } from "./format";
import { CATEGORIES, FORMATS, LEVELS, lines } from "./types";

// 기획서 "규칙" 입력 규칙. 백엔드도 같은 규칙과 문구로 다시 검사한다.

export type FieldErrors = Record<string, string>;

export interface CohortFormValues {
  key: string;
  startDate: string;
  endDate: string;
  capacity: string;
  schedule: string;
  applyDeadline: string;
}

export interface CourseFormValues {
  title: string;
  category: string;
  level: string;
  format: string;
  summary: string;
  description: string;
  price: string;
  defaultCapacity: string;
  instructorName: string;
  instructorBio: string;
  recommendedFor: string;
  curriculum: string;
  preparation: string;
  cohorts: CohortFormValues[];
}

const DIGITS = /^\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CAPACITY = 60;
const MAX_WEEKS = 26;

function isRealDate(value: string) {
  if (!DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function checkLength(value: string, min: number, max: number, empty: string, range: string) {
  const v = value.trim();
  if (!v) return empty;
  if (v.length < min || v.length > max) return range;
  return null;
}

function checkCapacity(value: string) {
  const v = value.trim();
  if (!v) return "정원을 입력해 주세요.";
  if (!DIGITS.test(v)) return "정원은 숫자로만 입력해 주세요. (예: 30)";
  if (Number(v) < 1 || Number(v) > MAX_CAPACITY) return `정원은 1명부터 ${MAX_CAPACITY}명까지 정할 수 있어요.`;
  return null;
}

export function validateCohort(c: Omit<CohortFormValues, "key">): FieldErrors {
  const errors: FieldErrors = {};

  if (!c.startDate.trim()) errors.startDate = "개강일을 골라 주세요.";
  else if (!isRealDate(c.startDate)) errors.startDate = "날짜 형식이 올바르지 않아요. 달력에서 날짜를 골라 주세요.";
  else if (c.startDate <= todayString()) errors.startDate = "개강일은 내일 이후 날짜로 골라 주세요.";

  if (!c.endDate.trim()) errors.endDate = "종강일을 골라 주세요.";
  else if (!isRealDate(c.endDate)) errors.endDate = "날짜 형식이 올바르지 않아요. 달력에서 날짜를 골라 주세요.";
  else if (isRealDate(c.startDate) && c.endDate < c.startDate) errors.endDate = "종강일은 개강일보다 뒤여야 해요.";
  else if (isRealDate(c.startDate) && daysBetween(c.startDate, c.endDate) > MAX_WEEKS * 7)
    errors.endDate = `한 기수는 최대 ${MAX_WEEKS}주까지 열 수 있어요.`;

  const cap = checkCapacity(c.capacity);
  if (cap) errors.capacity = cap;

  if (c.schedule.trim().length > 40) errors.schedule = "수업 시간 안내는 40자 이내로 적어 주세요.";

  // 신청 마감일은 선택. 비워 두면 개강 전날로 정해진다
  const deadline = c.applyDeadline.trim();
  if (deadline) {
    if (!isRealDate(deadline)) errors.applyDeadline = "날짜 형식이 올바르지 않아요. 달력에서 날짜를 골라 주세요.";
    else if (deadline < todayString()) errors.applyDeadline = "신청 마감일은 오늘 이후 날짜로 골라 주세요.";
    else if (isRealDate(c.startDate) && deadline > c.startDate) errors.applyDeadline = "신청 마감일은 개강일과 같거나 그 전이어야 해요.";
  }

  return errors;
}

// 과정 등록은 첫 기수가 함께 필요하고, 과정 수정은 과정 정보만 검사한다
export function validateCourse(v: CourseFormValues, { withCohorts = true } = {}): FieldErrors {
  const errors: FieldErrors = {};
  const set = (key: string, message: string | null) => {
    if (message) errors[key] = message;
  };

  set("title", checkLength(v.title, 2, 40, "과정 이름을 입력해 주세요.", "과정 이름은 2~40자로 입력해 주세요."));
  if (!CATEGORIES.includes(v.category as never)) errors.category = "분야를 골라 주세요.";
  if (!LEVELS.includes(v.level as never)) errors.level = "난이도를 골라 주세요.";
  if (!FORMATS.includes(v.format as never)) errors.format = "수업 방식을 골라 주세요.";
  set("summary", checkLength(v.summary, 5, 60, "한 줄 소개를 입력해 주세요.", "한 줄 소개를 5~60자로 입력해 주세요."));

  const price = v.price.replaceAll(",", "").trim();
  if (!price) errors.price = "수강료를 입력해 주세요. 무료라면 0을 입력해 주세요.";
  else if (!DIGITS.test(price)) errors.price = "수강료는 숫자로만 입력해 주세요. (예: 190000)";
  else if (Number(price) > 5_000_000) errors.price = "수강료는 500만 원 이하로 입력해 주세요.";

  set("defaultCapacity", checkCapacity(v.defaultCapacity));
  set("instructorName", checkLength(v.instructorName, 1, 20, "강사 이름을 입력해 주세요.", "강사 이름은 20자 이내로 입력해 주세요."));
  if (v.instructorBio.trim().length > 60) errors.instructorBio = "강사 소개는 60자 이내로 적어 주세요.";

  const recommended = lines(v.recommendedFor);
  if (recommended.length === 0) errors.recommendedFor = "추천 대상을 한 줄 이상 적어 주세요.";
  else if (recommended.length > 5) errors.recommendedFor = "추천 대상은 5줄까지 적을 수 있어요.";

  const steps = lines(v.curriculum);
  if (steps.length === 0) errors.curriculum = "커리큘럼을 한 줄 이상 적어 주세요.";
  else if (steps.length > 26) errors.curriculum = "커리큘럼은 26줄까지 적을 수 있어요.";

  if (v.preparation.trim().length > 300) errors.preparation = "준비 사항은 300자 이내로 적어 주세요.";
  set("description", checkLength(v.description, 10, 1000, "과정 소개를 입력해 주세요.", "과정 소개를 10자 이상, 1000자 이내로 적어 주세요."));

  if (!withCohorts) return errors;
  if (v.cohorts.length === 0) errors.cohorts = "기수를 하나 이상 추가해 주세요.";
  v.cohorts.forEach((c, i) => {
    for (const [field, message] of Object.entries(validateCohort(c))) {
      errors[`cohorts.${i}.${field}`] = message;
    }
  });

  return errors;
}

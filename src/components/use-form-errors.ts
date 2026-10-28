"use client";

import { useState, type FocusEvent } from "react";
import type { FieldErrors } from "@/lib/validation";

/*
 * 입력 검사 시점 (Baymard inline validation)
 * - 칸을 떠날 때(blur) 그 칸을 검사하고, 고치는 즉시 오류가 사라진다
 * - 아직 손대지 않은 칸은 제출 전까지 오류를 보여 주지 않는다
 * - 제출에 실패하면 모든 오류를 보여 주고, 첫 번째 틀린 칸으로 이동한다
 */
export function useFormErrors<V>(
  values: V,
  validate: (v: V) => FieldErrors,
  { idToKey, keyToId }: { idToKey: (id: string) => string; keyToId: (key: string) => string },
) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});

  const all = validate(values);
  const visible: FieldErrors = {};
  for (const [key, message] of Object.entries(all)) {
    if (submitted || touched.has(key)) visible[key] = message;
  }
  const errors = { ...serverErrors, ...visible };

  const goTo = (key: string) => {
    const el = document.getElementById(keyToId(key));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  return {
    errors,
    // form의 onBlur에 연결: 포커스가 빠져나간 칸(또는 칸을 감싼 선택 그룹)을 "손댄 칸"으로 표시
    onBlur(e: FocusEvent<HTMLFormElement>) {
      const id = (e.target as HTMLElement).closest("[id]")?.id;
      if (!id) return;
      const key = idToKey(id);
      setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    },
    // 값이 바뀌면 이전 서버 오류는 지운다 (화면 검사가 다시 판단)
    clearServerErrors() {
      if (Object.keys(serverErrors).length > 0) setServerErrors({});
    },
    // 제출 시 호출. 화면 검사를 통과하면 true
    trySubmit() {
      setSubmitted(true);
      setServerErrors({});
      const first = Object.keys(all)[0];
      if (!first) return true;
      goTo(first);
      return false;
    },
    showServerErrors(next: FieldErrors) {
      setServerErrors(next);
      const first = Object.keys(next)[0];
      if (first) goTo(first);
    },
  };
}

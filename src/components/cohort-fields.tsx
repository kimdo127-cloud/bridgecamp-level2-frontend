"use client";

import { Field, inputClass } from "@/components/ui";
import type { CohortFormValues } from "@/lib/validation";

type Values = Omit<CohortFormValues, "key">;

// 기수 한 개(개강일·종강일·신청 마감일·정원·수업 시간) 입력칸. 과정 등록과 기수 추가 화면에서 함께 쓴다.
export function CohortFields({
  idPrefix,
  values,
  errors,
  onChange,
}: {
  idPrefix: string;
  values: Values;
  errors: Partial<Record<keyof Values, string>>;
  onChange: (patch: Partial<Values>) => void;
}) {
  const id = (f: keyof Values) => `${idPrefix}${f}`;
  const aria = (f: keyof Values) => ({
    "aria-invalid": Boolean(errors[f]),
    "aria-describedby": errors[f] ? `${id(f)}-error` : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field id={id("startDate")} label="개강일" required error={errors.startDate}>
          <input id={id("startDate")} type="date" value={values.startDate} onChange={(e) => onChange({ startDate: e.target.value })} className={inputClass} {...aria("startDate")} />
        </Field>
        <Field id={id("endDate")} label="종강일" required error={errors.endDate}>
          <input id={id("endDate")} type="date" min={values.startDate || undefined} value={values.endDate} onChange={(e) => onChange({ endDate: e.target.value })} className={inputClass} {...aria("endDate")} />
        </Field>
      </div>
      <Field id={id("applyDeadline")} label="신청 마감일" hint="비워 두면 개강 전날까지 신청을 받아요." error={errors.applyDeadline}>
        <input
          id={id("applyDeadline")}
          type="date"
          max={values.startDate || undefined}
          value={values.applyDeadline}
          onChange={(e) => onChange({ applyDeadline: e.target.value })}
          className={inputClass}
          {...aria("applyDeadline")}
        />
      </Field>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Field id={id("capacity")} label="정원" required error={errors.capacity}>
          <div className="relative">
            <input id={id("capacity")} inputMode="numeric" value={values.capacity} onChange={(e) => onChange({ capacity: e.target.value })} className={`${inputClass} pr-9`} {...aria("capacity")} />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-soft">명</span>
          </div>
        </Field>
        <Field id={id("schedule")} label="수업 시간" error={errors.schedule}>
          <input id={id("schedule")} value={values.schedule} placeholder="예: 화·목 19:30~21:30" maxLength={50} onChange={(e) => onChange({ schedule: e.target.value })} className={inputClass} {...aria("schedule")} />
        </Field>
      </div>
    </div>
  );
}

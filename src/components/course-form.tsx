"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CohortFields } from "@/components/cohort-fields";
import { ThumbnailPicker } from "@/components/thumbnail-picker";
import { useFormErrors } from "@/components/use-form-errors";
import { BottomBar, Field, SectionCard, TopBar, inputClass, primaryButton, secondaryButton, setFlash } from "@/components/ui";
import { ApiError, createCourse, updateCourse } from "@/lib/api";
import { CATEGORIES, FORMATS, LEVELS, type Category, type CourseWithCohorts, type Format, type Level } from "@/lib/types";
import { validateCourse, type CohortFormValues, type CourseFormValues } from "@/lib/validation";

let keySeq = 0;
const newCohort = (capacity = ""): CohortFormValues => ({ key: `c${++keySeq}`, startDate: "", endDate: "", capacity, schedule: "", applyDeadline: "" });

const INITIAL: CourseFormValues = {
  title: "",
  category: "",
  level: "",
  format: "",
  summary: "",
  description: "",
  price: "",
  defaultCapacity: "",
  instructorName: "",
  instructorBio: "",
  recommendedFor: "",
  curriculum: "",
  preparation: "",
  cohorts: [newCohort()],
};

type TextKey = Exclude<keyof CourseFormValues, "cohorts">;

function fromCourse(c: CourseWithCohorts): CourseFormValues {
  return {
    title: c.title,
    category: c.category,
    level: c.level,
    format: c.format,
    summary: c.summary,
    description: c.description,
    price: String(c.price),
    defaultCapacity: String(c.defaultCapacity),
    instructorName: c.instructorName,
    instructorBio: c.instructorBio,
    recommendedFor: c.recommendedFor,
    curriculum: c.curriculum,
    preparation: c.preparation,
    cohorts: [],
  };
}

// 과정 등록과 과정 수정이 같은 폼을 쓴다. 수정할 때는 기수 칸을 빼고(기수는 따로 수정) 기존 값을 채운다
export function CourseForm({ course }: { course?: CourseWithCohorts }) {
  const editing = Boolean(course);
  const router = useRouter();
  const [values, setValues] = useState<CourseFormValues>(course ? fromCourse(course) : INITIAL);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(course?.thumbnail ?? null);
  // 오류 키(cohorts.0.startDate)와 칸 id(cohorts-0-startDate)를 서로 바꾼다
  const form = useFormErrors(values, (v) => validateCourse(v, { withCohorts: !editing }), {
    idToKey: (id) => (id === "cohorts-section" ? "cohorts" : id.replace(/^cohorts-(\d+)-/, "cohorts.$1.")),
    keyToId: (key) => (key === "cohorts" ? "cohorts-section" : key.replaceAll(".", "-")),
  });
  const errors = form.errors;

  const update = (next: CourseFormValues) => {
    setValues(next);
    form.clearServerErrors();
  };
  const set = (key: TextKey, value: string) => update({ ...values, [key]: value });

  const setCohort = (index: number, patch: Partial<CohortFormValues>) =>
    update({ ...values, cohorts: values.cohorts.map((c, i) => (i === index ? { ...c, ...patch } : c)) });

  const addCohort = () => update({ ...values, cohorts: [...values.cohorts, newCohort(values.defaultCapacity)] });
  const removeCohort = (index: number) => update({ ...values, cohorts: values.cohorts.filter((_, i) => i !== index) });

  const changeCapacity = (value: string) => {
    // 기수 정원이 비어 있거나 기본 정원과 같았다면 함께 바꿔 준다
    const cohorts = values.cohorts.map((c) => (c.capacity === "" || c.capacity === values.defaultCapacity ? { ...c, capacity: value } : c));
    update({ ...values, defaultCapacity: value, cohorts });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.trySubmit()) return;

    setSaving(true);
    try {
      const fields = {
        title: values.title.trim(),
        category: values.category as Category,
        level: values.level as Level,
        format: values.format as Format,
        summary: values.summary.trim(),
        description: values.description.trim(),
        price: Number(values.price.replaceAll(",", "")),
        defaultCapacity: Number(values.defaultCapacity),
        instructorName: values.instructorName.trim(),
        instructorBio: values.instructorBio.trim(),
        recommendedFor: values.recommendedFor.trim(),
        curriculum: values.curriculum.trim(),
        preparation: values.preparation.trim(),
        thumbnail,
      };
      if (course) {
        await updateCourse(course.id, fields);
        setFlash("수정한 내용을 저장했어요");
        router.replace(`/admin/courses/${course.id}`);
      } else {
        const created = await createCourse({
          ...fields,
          cohorts: values.cohorts.map((c) => ({
            startDate: c.startDate,
            endDate: c.endDate,
            capacity: Number(c.capacity),
            schedule: c.schedule.trim(),
            applyDeadline: c.applyDeadline,
          })),
        });
        setFlash("과정이 등록됐어요");
        router.replace(`/admin/courses/${created.id}`);
      }
    } catch (e) {
      setSaving(false);
      // 백엔드가 거절한 경우 칸별 안내를, 연결 문제면 전체 안내를 보여 준다
      if (e instanceof ApiError && Object.keys(e.errors).length > 0) form.showServerErrors(e.errors);
      else setFormError(e instanceof ApiError ? e.message : "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };

  const aria = (key: string) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  return (
    <main>
      <TopBar title={editing ? "과정 수정" : "과정 등록"} backHref={course ? `/admin/courses/${course.id}` : "/admin"} />

      <form noValidate onSubmit={onSubmit} onBlur={form.onBlur} className="space-y-3 px-4 pt-4">
        <p className="px-1 pb-1 text-sm text-ink-soft">
          <span className="text-brand-600">*</span> 표시는 꼭 채워 주세요.
        </p>

        {formError && (
          <p role="alert" className="rounded-2xl bg-[#fff4f4] px-4 py-3 text-sm text-[#a83232]">
            {formError}
          </p>
        )}

        <SectionCard title="기본 정보">
          <Field id="thumbnail" label="대표 사진" error={errors.thumbnail}>
            <ThumbnailPicker id="thumbnail" value={thumbnail} onChange={setThumbnail} />
          </Field>

          <Field id="title" label="과정 이름" required hint="2~40자" error={errors.title}>
            <input id="title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="예: ChatGPT 업무 자동화 입문" maxLength={50} className={inputClass} {...aria("title")} />
          </Field>

          <Field id="category" label="분야" required error={errors.category}>
            <div id="category" tabIndex={-1} role="radiogroup" aria-invalid={Boolean(errors.category)} className="flex flex-wrap gap-2 outline-none">
              {CATEGORIES.map((c) => (
                <ChoiceChip key={c} selected={values.category === c} onClick={() => set("category", c)}>
                  {c}
                </ChoiceChip>
              ))}
            </div>
          </Field>

          <Field id="level" label="난이도" required error={errors.level}>
            <div id="level" tabIndex={-1} role="radiogroup" aria-invalid={Boolean(errors.level)} className="grid grid-cols-3 gap-2 outline-none">
              {LEVELS.map((l) => (
                <ChoiceChip key={l} selected={values.level === l} onClick={() => set("level", l)} wide>
                  {l}
                </ChoiceChip>
              ))}
            </div>
          </Field>

          <Field id="summary" label="한 줄 소개" required hint="목록에 보이는 짧은 소개예요. 5~60자" error={errors.summary}>
            <input id="summary" value={values.summary} onChange={(e) => set("summary", e.target.value)} placeholder="예: 반복 업무를 AI로 줄이는 4주" maxLength={70} className={inputClass} {...aria("summary")} />
          </Field>
        </SectionCard>

        <SectionCard title="운영 정보">
          <Field id="format" label="수업 방식" required error={errors.format}>
            <div id="format" tabIndex={-1} role="radiogroup" aria-invalid={Boolean(errors.format)} className="grid grid-cols-3 gap-2 outline-none">
              {FORMATS.map((f) => (
                <ChoiceChip key={f} selected={values.format === f} onClick={() => set("format", f)} wide>
                  {f}
                </ChoiceChip>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="price" label="수강료" required hint="무료는 0" error={errors.price}>
              <div className="relative">
                <input id="price" inputMode="numeric" value={values.price} onChange={(e) => set("price", e.target.value)} placeholder="190000" className={`${inputClass} pr-9`} {...aria("price")} />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-soft">원</span>
              </div>
            </Field>
            <Field id="defaultCapacity" label="기본 정원" required error={errors.defaultCapacity}>
              <div className="relative">
                <input id="defaultCapacity" inputMode="numeric" value={values.defaultCapacity} onChange={(e) => changeCapacity(e.target.value)} placeholder="30" className={`${inputClass} pr-9`} {...aria("defaultCapacity")} />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-soft">명</span>
              </div>
            </Field>
          </div>

          <Field id="instructorName" label="강사" required error={errors.instructorName}>
            <input id="instructorName" value={values.instructorName} onChange={(e) => set("instructorName", e.target.value)} placeholder="예: 이서준" maxLength={30} className={inputClass} {...aria("instructorName")} />
          </Field>
          <Field id="instructorBio" label="강사 한 줄 소개" hint="60자 이내" error={errors.instructorBio}>
            <input id="instructorBio" value={values.instructorBio} onChange={(e) => set("instructorBio", e.target.value)} placeholder="예: 사내 AI 도입 프로젝트 리드 · 강의 5년" maxLength={70} className={inputClass} {...aria("instructorBio")} />
          </Field>
        </SectionCard>

        <SectionCard title="소개 · 커리큘럼">
          <Field id="description" label="과정 소개" required hint={`무엇을 배우고 무엇이 남는지 적어 주세요. (${values.description.trim().length}/1000)`} error={errors.description}>
            <textarea id="description" rows={6} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="예: 매일 반복하는 업무를 AI로 줄이는 방법을 배워요." className={`${inputClass} resize-none leading-relaxed`} {...aria("description")} />
          </Field>
          <Field id="recommendedFor" label="이런 분께 추천해요" required hint="한 줄에 하나씩, 5줄까지" error={errors.recommendedFor}>
            <textarea id="recommendedFor" rows={3} value={values.recommendedFor} onChange={(e) => set("recommendedFor", e.target.value)} placeholder={"예: 매일 비슷한 문서를 반복해서 만드는 직장인\n코딩 없이 업무를 자동화하고 싶은 분"} className={`${inputClass} resize-none leading-relaxed`} {...aria("recommendedFor")} />
          </Field>
          <Field id="curriculum" label="커리큘럼" required hint="한 줄에 한 단계(주차)씩" error={errors.curriculum}>
            <textarea id="curriculum" rows={4} value={values.curriculum} onChange={(e) => set("curriculum", e.target.value)} placeholder={"예: 프롬프트 기본기\n문서 업무 자동화\n내 업무 자동화 프로젝트"} className={`${inputClass} resize-none leading-relaxed`} {...aria("curriculum")} />
          </Field>
          <Field id="preparation" label="준비 사항" hint="300자 이내" error={errors.preparation}>
            <textarea id="preparation" rows={2} value={values.preparation} onChange={(e) => set("preparation", e.target.value)} placeholder="예: 노트북과 ChatGPT 무료 계정을 준비해 주세요." className={`${inputClass} resize-none leading-relaxed`} {...aria("preparation")} />
          </Field>
        </SectionCard>

        {!editing && (
        <div id="cohorts-section" tabIndex={-1} className="outline-none">
          <SectionCard title="기수 정보" action={<span className="text-xs text-ink-soft">1개 이상 · 나중에 더 추가할 수 있어요</span>}>
            {errors.cohorts && (
              <p role="alert" className="text-[13px] text-[#c23b3b]">
                ⚠︎ {errors.cohorts}
              </p>
            )}
            {values.cohorts.map((c, i) => (
              <div key={c.key} className="rounded-2xl border border-line p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-brand-700">{i + 1}기</p>
                  <button type="button" onClick={() => removeCohort(i)} className="h-9 rounded-lg px-2 text-sm text-ink-soft active:bg-brand-50">
                    삭제
                  </button>
                </div>
                <CohortFields
                  idPrefix={`cohorts-${i}-`}
                  values={c}
                  onChange={(patch) => setCohort(i, patch)}
                  errors={{
                    startDate: errors[`cohorts.${i}.startDate`],
                    endDate: errors[`cohorts.${i}.endDate`],
                    capacity: errors[`cohorts.${i}.capacity`],
                    schedule: errors[`cohorts.${i}.schedule`],
                    applyDeadline: errors[`cohorts.${i}.applyDeadline`],
                  }}
                />
              </div>
            ))}
            <button type="button" onClick={addCohort} className={`${secondaryButton} w-full border-dashed`}>
              + 기수 추가
            </button>
          </SectionCard>
        </div>
        )}

        <BottomBar>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "저장하는 중…" : editing ? "수정 내용 저장" : "과정 등록하기"}
          </button>
        </BottomBar>
      </form>
    </main>
  );
}

function ChoiceChip({ selected, onClick, children, wide }: { selected: boolean; onClick: () => void; children: string; wide?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`h-11 rounded-xl border px-4 text-[15px] font-medium transition ${wide ? "w-full" : ""} ${
        selected ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink active:bg-brand-50"
      }`}
    >
      {children}
    </button>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitEnquiry } from "@/app/(site)/contact/actions";
import {
  BUDGETS,
  EXISTING_OPTIONS,
  type EnquiryInput,
  enquirySchema,
  PROJECT_TYPES,
  TIMELINES,
} from "@/lib/enquiry";

type Draft = {
  name: string;
  company: string;
  email: string;
  phone: string;
  projectTypes: string[];
  existingSystem: string;
  existingUrl: string;
  description: string;
  budget: string;
  timeline: string;
};

const EMPTY: Draft = {
  name: "",
  company: "",
  email: "",
  phone: "",
  projectTypes: [],
  existingSystem: "",
  existingUrl: "",
  description: "",
  budget: "",
  timeline: "",
};

const BRIEF_LABELS = ["Name", "Company", "Contact", "Project type", "Existing system", "Challenge", "Budget", "Timeline"];
const REVIEW_STEP = 8;
const OPTIONAL_STEPS = new Set([1, 4, 6, 7]);

const pad = (n: number) => String(n).padStart(2, "0");

// Per-step checks reuse the server schema so both sides agree.
function validate(step: number, draft: Draft) {
  const field =
    step === 0
      ? enquirySchema.shape.name.safeParse(draft.name)
      : step === 2
        ? enquirySchema.shape.email.safeParse(draft.email)
        : step === 3
          ? enquirySchema.shape.projectTypes.safeParse(draft.projectTypes)
          : null;
  return field && !field.success ? (field.error.issues[0]?.message ?? "Please check this answer.") : "";
}

function briefValues(d: Draft) {
  return [
    d.name.trim(),
    d.company.trim(),
    [d.email.trim(), d.phone.trim()].filter(Boolean).join(" · "),
    d.projectTypes.join(", "),
    d.existingSystem ? d.existingSystem + (d.existingSystem === "Yes" && d.existingUrl.trim() ? ` — ${d.existingUrl.trim()}` : "") : "",
    d.description.trim(),
    d.budget,
    d.timeline,
  ];
}

export function GuidedForm() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Move focus to the new question so keyboard and screen-reader users follow
  // the conversation. On first load only fine pointers get focus, so mobile
  // keyboards don't pop open uninvited.
  useEffect(() => {
    if (reference) {
      doneRef.current?.focus();
      return;
    }
    const initial = firstRender.current;
    firstRender.current = false;
    if (initial && !window.matchMedia("(pointer: fine)").matches) return;
    const container = stepRef.current;
    const target = container?.querySelector<HTMLElement>("[data-focus]") ?? container?.querySelector<HTMLElement>("[data-question]");
    target?.focus({ preventScroll: initial });
  }, [step, reference]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const toggleType = (type: string) =>
    set(
      "projectTypes",
      draft.projectTypes.includes(type) ? draft.projectTypes.filter((t) => t !== type) : [...draft.projectTypes, type],
    );

  const values = briefValues(draft);
  const filled = values.filter(Boolean).length;
  const sent = reference !== null;

  const submit = () => {
    startTransition(async () => {
      const result = await submitEnquiry(draft as EnquiryInput, {
        startedAt: startedAt.current,
        website: honeypot.current?.value ?? "",
      });
      if (result.ok) setReference(result.reference);
      else setError(result.error);
    });
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (sent || pending) return;
    const problem = validate(step, draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (step < REVIEW_STEP) {
      setStep(step + 1);
      setError("");
    } else {
      submit();
    }
  };

  const back = () => {
    if (step === 0) return;
    setStep(step - 1);
    setError("");
  };

  const stepLabel = sent ? "Complete" : step < REVIEW_STEP ? `Step ${pad(step + 1)} / 08` : "Review";
  const progress = sent ? 100 : (step / REVIEW_STEP) * 100;
  const skippable = OPTIONAL_STEPS.has(step) && !values[step];
  const nextLabel = step === REVIEW_STEP ? (pending ? "Sending…" : "Start the conversation →") : skippable ? "Skip →" : "Continue →";
  const errorId = "enquiry-error";
  const invalid = (forStep: number) => (error && step === forStep ? true : undefined);
  const describedBy = (forStep: number) => (error && step === forStep ? errorId : undefined);

  return (
    <div className="contact-grid">
      <section className="contact-main" aria-labelledby="contact-title">
        <div>
          <div className="type-mono mb-[14px] flex justify-between text-label">
            <span>Start a project</span>
            <span aria-live="polite">{stepLabel}</span>
          </div>
          <div className="contact-progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        {sent ? (
          <div data-in="" className="contact-done">
            <span className="type-mono text-acc">● Enquiry received · {reference}</span>
            <h1 id="contact-title" ref={doneRef} tabIndex={-1} className="contact-thanks">
              Thank you.
            </h1>
            <p className="m-0 max-w-[520px] text-[clamp(20px,1.8vw,26px)] leading-[1.35] tracking-[-0.015em]">
              We&rsquo;ll review your project details and contact you to discuss the next steps.
            </p>
            <div className="mt-3 flex flex-wrap gap-[10px]">
              <Link href="/" className="btn-outline type-mono-12">
                Back to home
              </Link>
              <Link href="/work" className="btn-outline type-mono-12">
                See our work ↗
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 id="contact-title" className={step === 0 ? "type-contact" : "sr-only"}>
              Tell us about your challenge<span className="text-acc">.</span>
            </h1>

            <form noValidate onSubmit={onSubmit} className="flex flex-1 flex-col gap-7">
              {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
              <div className="hp" aria-hidden="true">
                <label>
                  Website
                  <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
                </label>
              </div>

              <div ref={stepRef} key={step} className="flex flex-col gap-7">
                {step === 0 && (
                  <>
                    <label htmlFor="f-name" className="q">
                      First — who are we speaking with?
                    </label>
                    <input
                      id="f-name"
                      data-focus=""
                      autoComplete="name"
                      className="field-lg"
                      placeholder="Your name"
                      value={draft.name}
                      onChange={(e) => set("name", e.target.value)}
                      aria-required="true"
                      aria-invalid={invalid(0)}
                      aria-describedby={describedBy(0)}
                    />
                  </>
                )}

                {step === 1 && (
                  <>
                    <label htmlFor="f-company" className="q">
                      Thanks, {draft.name.trim().split(" ")[0] || "there"}. Which organisation are you with?
                    </label>
                    <input
                      id="f-company"
                      data-focus=""
                      autoComplete="organization"
                      className="field-lg"
                      placeholder="Company / organisation"
                      value={draft.company}
                      onChange={(e) => set("company", e.target.value)}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className="q" data-question="" tabIndex={-1}>
                      Where should we reply?
                    </p>
                    <label className="flex flex-col gap-[6px]">
                      <span className="type-mono text-label">Work email · required</span>
                      <input
                        data-focus=""
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        className="field-md"
                        placeholder="name@organisation.com"
                        value={draft.email}
                        onChange={(e) => set("email", e.target.value)}
                        aria-required="true"
                        aria-invalid={invalid(2)}
                        aria-describedby={describedBy(2)}
                      />
                    </label>
                    <label className="flex flex-col gap-[6px]">
                      <span className="type-mono text-label">Phone · optional</span>
                      <input
                        type="tel"
                        autoComplete="tel"
                        className="field-md field-soft"
                        placeholder="+61"
                        value={draft.phone}
                        onChange={(e) => set("phone", e.target.value)}
                      />
                    </label>
                  </>
                )}

                {step === 3 && (
                  <fieldset className="choice-set" aria-describedby={describedBy(3)}>
                    <legend className="q" data-question="" tabIndex={-1}>
                      What are you looking to build? <span className="text-faint">Select all that apply.</span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {PROJECT_TYPES.map((type) => (
                        <label key={type} className="chip">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={draft.projectTypes.includes(type)}
                            onChange={() => toggleType(type)}
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {step === 4 && (
                  <>
                    <fieldset className="choice-set">
                      <legend className="q" data-question="" tabIndex={-1}>
                        Do you have an existing website or system?
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {EXISTING_OPTIONS.map((option) => (
                          <label key={option} className="chip">
                            <input
                              type="radio"
                              name="existing"
                              className="sr-only"
                              checked={draft.existingSystem === option}
                              onChange={() => set("existingSystem", option)}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {draft.existingSystem === "Yes" && (
                      <label className="flex flex-col gap-[6px]">
                        <span className="type-mono text-label">URL or system name · optional</span>
                        <input
                          className="field-sm"
                          placeholder="https:// or e.g. legacy CRM"
                          value={draft.existingUrl}
                          onChange={(e) => set("existingUrl", e.target.value)}
                        />
                      </label>
                    )}
                  </>
                )}

                {step === 5 && (
                  <>
                    <label htmlFor="f-desc" className="q">
                      Tell us about the challenge.
                    </label>
                    <p id="f-desc-hint" className="m-0 max-w-[520px] text-[16px] leading-[1.5] text-label">
                      What&rsquo;s not working today, who it affects and what a good outcome would look like. Rough notes
                      are fine.
                    </p>
                    <textarea
                      id="f-desc"
                      data-focus=""
                      rows={6}
                      maxLength={5000}
                      className="field-area"
                      placeholder="We currently…"
                      value={draft.description}
                      onChange={(e) => set("description", e.target.value)}
                      aria-describedby="f-desc-hint"
                    />
                  </>
                )}

                {(step === 6 || step === 7) && (
                  <fieldset className="choice-set">
                    <legend className="q" data-question="" tabIndex={-1}>
                      {step === 6 ? (
                        <>
                          Estimated budget range <span className="text-faint">(AUD)</span>
                        </>
                      ) : (
                        "Desired timeline"
                      )}
                    </legend>
                    <div className="choice-grid">
                      {(step === 6 ? BUDGETS : TIMELINES).map((option, index) => {
                        const key = step === 6 ? "budget" : "timeline";
                        return (
                          <label key={option} className="chip chip-row">
                            <input
                              type="radio"
                              name={key}
                              className="sr-only"
                              checked={draft[key] === option}
                              onChange={() => set(key, option)}
                            />
                            {option}
                            <span className="font-mono text-[11px]" aria-hidden="true">
                              {pad(index + 1)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {step === REVIEW_STEP && (
                  <>
                    <p className="q" data-question="" tabIndex={-1}>
                      Ready when you are. Check the brief, then send it through.
                    </p>
                    <p className="m-0 max-w-[520px] text-[16px] leading-[1.5] text-label">
                      Your details are used only to respond to this enquiry. See our{" "}
                      <Link href="/privacy" className="underline underline-offset-2">
                        privacy policy
                      </Link>
                      .
                    </p>
                  </>
                )}
              </div>

              <p id={errorId} role="alert" className="contact-error">
                {error}
              </p>

              <div className="contact-actions">
                <button type="button" onClick={back} disabled={step === 0 || pending} className="contact-back type-mono-12">
                  ← Back
                </button>
                <div className="flex items-center gap-4">
                  {step !== 5 && step !== REVIEW_STEP && (
                    <span className="type-mono hidden text-faint sm:inline" aria-hidden="true">
                      Press Enter ↵
                    </span>
                  )}
                  <button
                    type="submit"
                    data-mag=""
                    disabled={pending}
                    className={`contact-next type-mono-12 ${step === REVIEW_STEP ? "is-final" : ""}`}
                  >
                    {nextLabel}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </section>

      <aside className="contact-brief" data-dark="" aria-label="Your project brief">
        <div className="type-mono flex justify-between text-on-dark-muted">
          <span>Project brief / draft</span>
          <span>{filled} / 8 fields</span>
        </div>
        <dl className="m-0 border-t border-[rgba(238,237,232,0.2)]">
          {BRIEF_LABELS.map((label, index) => {
            const current = index === step && !sent;
            return (
              <div key={label} className="brief-row" data-current={current || undefined}>
                <span className="font-mono text-[10px]" aria-hidden="true">
                  {pad(index + 1)}
                </span>
                <dt className="type-mono text-on-dark-muted">{label}</dt>
                <dd className={values[index] ? "text-on-dark" : "text-on-dark-muted"}>
                  {values[index] || (current ? "…" : "—")}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="type-mono mt-auto flex flex-col gap-2 text-on-dark-muted">
          <span>
            Prefer email?{" "}
            <a href="mailto:hello@example.com" className="text-on-dark">
              hello@[domain].com
            </a>
          </span>
          <span>Response within [X] business days · Australia</span>
        </div>
      </aside>
    </div>
  );
}

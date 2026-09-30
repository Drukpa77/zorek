"use client";

import { useId, useState } from "react";

export function Switch({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const labelId = useId();
  const hintId = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex flex-col gap-0.5">
        <span id={labelId} className="text-[13.5px]">
          {label}
        </span>
        {hint ? (
          <span id={hintId} className="text-[11.5px] text-label">
            {hint}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        className="admin-switch"
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

/** Multi-select chips from a fixed option list, plus any custom values already set. */
export function ChipGroup({
  label,
  options,
  value,
  onChange,
  allowCustom,
  max,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  allowCustom?: boolean;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const labelId = useId();
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  const full = max !== undefined && value.length >= max;
  const add = () => {
    const next = draft.trim();
    if (!next || value.includes(next) || full) return;
    onChange([...value, next]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="admin-eyebrow">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {all.map((option) => {
          const on = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              className="admin-chip"
              disabled={!on && full}
              onClick={() => onChange(on ? value.filter((v) => v !== option) : [...value, option])}
            >
              {option}
            </button>
          );
        })}
      </div>
      {allowCustom ? (
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            maxLength={60}
            placeholder="Add another…"
            aria-label={`Add to ${label}`}
            className="admin-field h-8 min-w-0 flex-1 text-[13px]"
          />
          <button type="button" className="admin-btn-sm" onClick={add} disabled={!draft.trim() || full}>
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Free-text tags: type and press Enter. */
export function TagInput({ label, value, onChange, max, hint }: { label: string; value: string[]; onChange: (value: string[]) => void; max: number; hint?: string }) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const add = () => {
    const next = draft.trim();
    if (!next || value.includes(next) || value.length >= max) return;
    onChange([...value, next]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="admin-eyebrow">
        {label}
      </label>
      {value.length ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label={label}>
          {value.map((tag) => (
            <li key={tag} className="admin-tag-chip">
              {tag}
              <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        id={inputId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        maxLength={60}
        disabled={value.length >= max}
        placeholder={value.length >= max ? `Up to ${max}` : "Type and press Enter"}
        className="admin-field h-9 text-[13px]"
      />
      {hint ? <span className="text-[11.5px] text-label">{hint}</span> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  max,
  placeholder,
  hint,
  mono,
  counter,
  multiline,
  rows = 3,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
  counter?: number;
  multiline?: boolean;
  rows?: number;
  error?: string;
}) {
  const id = useId();
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    value,
    maxLength: max,
    placeholder,
    "aria-describedby": described,
    "aria-invalid": error ? true : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="admin-eyebrow flex justify-between gap-2">
        <span>{label}</span>
        {counter !== undefined ? (
          <span className={value.length > counter ? "text-[#8A5A00]" : undefined} aria-hidden="true">
            {value.length}/{counter}
          </span>
        ) : null}
      </label>
      {multiline ? (
        <textarea {...common} rows={rows} className="admin-field h-auto py-2.5 leading-[1.5]" />
      ) : (
        <input {...common} className={`admin-field ${mono ? "font-mono text-[12.5px]" : ""}`} />
      )}
      {hint ? (
        <span id={`${id}-hint`} className="text-[11.5px] text-label">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="text-[11.5px] text-[var(--destructive)]">
          {error}
        </span>
      ) : null}
    </div>
  );
}

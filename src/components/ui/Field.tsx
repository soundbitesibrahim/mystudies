/** Labelled form controls. Every input gets a real <label>. */

import React, { useId } from 'react';

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
}

export function TextField({
  label,
  hint,
  error,
  className = '',
  ...rest
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        {hint && <span className="field__hint">{hint}</span>}
      </label>
      <input
        id={id}
        className="input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      {error && (
        <span className="field__error" id={`${id}-err`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className = '',
  children,
  ...rest
}: BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        {hint && <span className="field__hint">{hint}</span>}
      </label>
      <select
        id={id}
        className="select"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <span className="field__error" id={`${id}-err`}>
          {error}
        </span>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className = '',
  ...rest
}: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        {hint && <span className="field__hint">{hint}</span>}
      </label>
      <textarea id={id} className="textarea" {...rest} />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

interface SliderFieldProps extends BaseProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  /** Text shown when the value is null. */
  emptyLabel?: string;
  min?: number;
  max?: number;
}

/** 0-100 rating with a "not rated yet" state that is genuinely empty. */
export function SliderField({
  label,
  hint,
  value,
  onValueChange,
  emptyLabel = 'Not rated',
  min = 0,
  max = 100,
  className = '',
}: SliderFieldProps) {
  const id = useId();
  const current = value ?? Math.round((min + max) / 2);
  const fill = ((current - min) / (max - min)) * 100;

  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        <span className="spacer" />
        <span className="rating-value num">{value === null ? emptyLabel : value}</span>
      </label>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={1}
        value={current}
        style={{ ['--fill' as string]: `${value === null ? 0 : fill}%` }}
        onChange={(e) => onValueChange(Number(e.target.value))}
      />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {hint && <span className="field__hint">{hint}</span>}
        {value !== null && (
          <button type="button" className="link-btn" onClick={() => onValueChange(null)}>
            Clear rating
          </button>
        )}
      </div>
    </div>
  );
}

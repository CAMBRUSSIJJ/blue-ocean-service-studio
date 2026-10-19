import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', ...props },
  ref,
) {
  return <button ref={ref} className={`bo-button bo-button--${variant} bo-button--${size} ${className}`.trim()} {...props} />;
});

export const IconButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function IconButton(
  { className = '', type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={`bo-icon-button ${className}`.trim()} {...props} />;
});

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref,
) {
  return <input ref={ref} className={`bo-input ${className}`.trim()} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', ...props },
  ref,
) {
  return <select ref={ref} className={`bo-select ${className}`.trim()} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = '', ...props },
  ref,
) {
  return <textarea ref={ref} className={`bo-textarea ${className}`.trim()} {...props} />;
});

export function Card({ className = '', interactive = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div className={`bo-card ${interactive ? 'bo-card--interactive' : ''} ${className}`.trim()} {...props} />;
}

export function StatusBadge({ tone = 'neutral', className = '', ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={`bo-status ${tone === 'neutral' ? '' : `bo-status--${tone}`} ${className}`.trim()} {...props} />;
}

export function Chip({ selected = false, className = '', ...props }: React.HTMLAttributes<HTMLSpanElement> & { selected?: boolean }) {
  return <span className={`bo-chip ${className}`.trim()} data-selected={selected ? 'true' : 'false'} {...props} />;
}

export function Field({ label, hint, error, children, className = '' }: { label: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <label className={`bo-field ${className}`.trim()}><span>{label}</span>{children}{error ? <span className="bo-field__error">{error}</span> : hint ? <span className="bo-field__hint">{hint}</span> : null}</label>;
}

export function Tabs({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bo-tabs ${className}`.trim()} role="tablist" {...props} />;
}

export function Tab({ active = false, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button type="button" className={`bo-tab ${className}`.trim()} aria-selected={active} role="tab" {...props} />;
}

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bo-skeleton ${className}`.trim()} aria-hidden="true" {...props} />;
}

export function EmptyState({ title, children, className = '' }: React.HTMLAttributes<HTMLDivElement> & { title: string }) {
  return <div className={`bo-empty-state ${className}`.trim()}><div><h3>{title}</h3>{children}</div></div>;
}

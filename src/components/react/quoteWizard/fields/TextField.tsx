import { useEffect, useRef } from 'react';

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** The step's question — doubles as this field's accessible name, since
      there's no visible <label> (the heading fills that role visually). */
  ariaLabel: string;
  placeholder?: string;
  autoFocus?: boolean;
  type?: 'text' | 'email' | 'tel';
  multiline?: boolean;
  autoComplete?: string;
  inputMode?: 'numeric' | 'tel' | 'email' | 'text';
  invalid?: boolean;
}

export default function TextField({
  value,
  onChange,
  onSubmit,
  ariaLabel,
  placeholder,
  autoFocus,
  type = 'text',
  multiline = false,
  autoComplete,
  inputMode,
  invalid,
}: TextFieldProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (multiline) {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onSubmit();
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-invalid={invalid}
        aria-label={ariaLabel}
        className="qw-input qw-input-multiline"
        placeholder={placeholder}
      />
    );
  }
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      aria-invalid={invalid}
      aria-label={ariaLabel}
      className="qw-input"
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
    />
  );
}

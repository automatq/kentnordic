interface ConsentFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** The legal affirmation, styled as a single selectable card rather than a
    plain checkbox row — kept as an explicit toggle (no auto-advance) since
    it's a legal step, not a quick pick. */
export default function ConsentField({ checked, onChange }: ConsentFieldProps) {
  return (
    <label className="qw-consent" data-checked={checked || undefined}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={!checked} />
      <span className="qw-consent-box" aria-hidden="true" />
      <span className="qw-consent-text">I agree to Idcibidci contacting me about this inquiry.</span>
    </label>
  );
}

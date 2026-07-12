import { motion } from 'framer-motion';

interface SelectFieldProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** Receives the just-picked option directly — React state won't have
      flushed by the time the deferred advance fires, so the caller can't
      rely on reading it back from its own props/state. */
  onSubmit: (value: string) => void;
  ariaLabel: string;
}

/** A grid of selectable chips — clicking one both picks and advances,
    with a brief pause so the pressed state is visible before the step
    transitions away. */
export default function SelectField({ value, options, onChange, onSubmit, ariaLabel }: SelectFieldProps) {
  const handleSelect = (option: string) => {
    onChange(option);
    setTimeout(() => onSubmit(option), 180);
  };

  return (
    <div className="qw-chip-grid" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <motion.button
            key={option}
            type="button"
            onClick={() => handleSelect(option)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="qw-chip"
            aria-pressed={selected}
            data-selected={selected || undefined}
          >
            {option}
          </motion.button>
        );
      })}
    </div>
  );
}

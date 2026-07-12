import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

const EASE = [0.22, 1, 0.36, 1] as const;

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

interface StepShellProps {
  stepKey: string;
  direction: number;
  index: number;
  total: number;
  title: string;
  helper?: string;
  required: boolean;
  error?: string | null;
  onBack?: () => void;
  onContinue: () => void;
  canSkip: boolean;
  hideContinue: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

/** One question, Typeform-style: slides in from the direction of travel,
    slides out the opposite way on Back/Continue. */
export default function StepShell({
  stepKey,
  direction,
  index,
  total,
  title,
  helper,
  required,
  error,
  onBack,
  onContinue,
  canSkip,
  hideContinue,
  isLast,
  children,
}: StepShellProps) {
  return (
    <motion.div
      key={stepKey}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.32, ease: EASE }}
      className="qw-step"
    >
      <p className="qw-step-count">
        Question {index + 1} of {total}
      </p>
      <h3 className="qw-step-title">
        {title}
        {!required && <span className="qw-step-optional">(optional)</span>}
      </h3>
      {helper && <p className="qw-step-helper">{helper}</p>}

      <div className="qw-step-field">{children}</div>

      {error && (
        <p className="qw-step-error" role="alert">
          {error}
        </p>
      )}

      <div className="qw-step-actions">
        {onBack && (
          <Button type="button" variant="secondary" size="sm" onClick={onBack}>
            <Icon name="arrow" size={15} className="rotate-180" /> Back
          </Button>
        )}
        {!hideContinue && (
          <Button type="button" size="sm" onClick={onContinue}>
            {isLast ? 'Review' : 'Continue'} <Icon name="arrow" size={15} />
          </Button>
        )}
        {canSkip && (
          <button type="button" className="qw-step-skip" onClick={onContinue}>
            Skip
          </button>
        )}
      </div>

      <p className="qw-step-hint">
        Press <kbd>Enter</kbd> to continue
      </p>
    </motion.div>
  );
}

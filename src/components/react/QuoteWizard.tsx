import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { submitInquiry, type InquiryPayload } from '@/lib/formProvider';
import ProgressBar from '@/components/react/quoteWizard/ProgressBar';
import StepShell from '@/components/react/quoteWizard/StepShell';
import TextField from '@/components/react/quoteWizard/fields/TextField';
import SelectField from '@/components/react/quoteWizard/fields/SelectField';
import ConsentField from '@/components/react/quoteWizard/fields/ConsentField';
import {
  buildSteps,
  emptyWizardData,
  labelFromPackageCode,
  packageCodeFromLabel,
  validateStep,
  LABELS,
  type PackageOption,
  type WizardData,
  type WizardStep,
} from '@/components/react/quoteWizard/schema';

interface QuoteWizardProps {
  packages: PackageOption[];
}

type Stage = 'flow' | 'review' | 'success';
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Guided, one-question-at-a-time alternative to InquiryForm — same fields,
 * same validation messages, same submitInquiry() provider, presented as a
 * Typeform-style flow. Selectable from the /contact page's mode toggle;
 * InquiryForm remains the default and the no-JS-safe fallback.
 */
export default function QuoteWizard({ packages }: QuoteWizardProps) {
  const [data, setData] = useState<WizardData>(emptyWizardData);
  const [stage, setStage] = useState<Stage>('flow');
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const successRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => buildSteps(packages), [packages]);
  const currentStep = steps[stepIndex] ?? null;
  const total = steps.length;

  // Pre-fill package from ?package=CODE, same as InquiryForm.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('package');
    if (code && packages.some((p) => p.code === code)) {
      setData((d) => ({ ...d, packageCode: labelFromPackageCode(code, packages) }));
    }
  }, [packages]);

  const patch = (delta: Partial<WizardData>) => setData((d) => ({ ...d, ...delta }));

  const goNext = (override?: Partial<WizardData>) => {
    if (!currentStep) return;
    const effective = override ? { ...data, ...override } : data;
    const err = validateStep(currentStep, effective);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setDirection(1);
    if (override) setData(effective);
    if (stepIndex >= total - 1) {
      setStage('review');
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    setDirection(-1);
    setError(null);
    if (stage === 'review') {
      setStage('flow');
      setStepIndex(total - 1);
      return;
    }
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const payload: InquiryPayload = {
      agency: data.agency,
      contact: data.contact,
      email: data.email,
      phone: data.phone,
      country: data.country,
      packageCode: packageCodeFromLabel(data.packageCode, packages),
      travelDates: data.travelDates,
      pax: data.pax,
      groupType: data.groupType === 'Not sure yet' ? '' : data.groupType,
      message: data.message,
      consent: data.consent ? 'yes' : '',
      sourcePage: window.location.pathname,
      botField: data.botField,
    };
    const res = await submitInquiry(payload);
    setSubmitting(false);
    if (res.ok) {
      setDirection(1);
      setStage('success');
    } else {
      setSubmitError(res.error || 'Something went wrong.');
    }
  };

  const renderField = (step: WizardStep) => {
    const onSubmit = () => goNext();
    switch (step.type) {
      case 'email':
      case 'tel':
      case 'text':
        return (
          <TextField
            type={step.type === 'text' ? 'text' : step.type}
            value={data[step.id as keyof WizardData] as string}
            onChange={(v) => patch({ [step.id]: v } as Partial<WizardData>)}
            onSubmit={onSubmit}
            ariaLabel={step.title}
            placeholder={step.placeholder}
            autoComplete={step.autoComplete}
            inputMode={step.inputMode}
            autoFocus
            invalid={!!error}
          />
        );
      case 'textarea':
        return (
          <TextField
            multiline
            value={data.message}
            onChange={(v) => patch({ message: v })}
            onSubmit={onSubmit}
            ariaLabel={step.title}
            placeholder={step.placeholder}
            autoFocus
            invalid={!!error}
          />
        );
      case 'select':
        return (
          <SelectField
            value={data[step.id as keyof WizardData] as string}
            options={step.options ?? []}
            onChange={(v) => patch({ [step.id]: v } as Partial<WizardData>)}
            onSubmit={(pickedValue) => goNext({ [step.id]: pickedValue } as Partial<WizardData>)}
            ariaLabel={step.title}
          />
        );
      case 'consent':
        return <ConsentField checked={data.consent} onChange={(v) => patch({ consent: v })} />;
      default:
        return null;
    }
  };

  const progress = stage === 'flow' ? stepIndex : total;

  return (
    <MotionConfig reducedMotion="user">
      <div className="qw">
        <ProgressBar current={progress} total={total} />
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="qw-honeypot"
          value={data.botField}
          onChange={(e) => patch({ botField: e.target.value })}
        />
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {stage === 'flow' && currentStep && (
            <StepShell
              key={`qw-step-${currentStep.id}`}
              stepKey={`qw-step-${currentStep.id}`}
              direction={direction}
              index={stepIndex}
              total={total}
              title={currentStep.title}
              helper={currentStep.helper}
              required={currentStep.required}
              error={error}
              onBack={stepIndex > 0 ? goBack : undefined}
              onContinue={() => goNext()}
              canSkip={!currentStep.required && currentStep.type !== 'select' && currentStep.type !== 'consent'}
              hideContinue={currentStep.type === 'select'}
              isLast={stepIndex === total - 1}
            >
              {renderField(currentStep)}
            </StepShell>
          )}

          {stage === 'review' && (
            <ReviewScreen
              key="qw-review"
              data={data}
              onBack={goBack}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={submitError}
              direction={direction}
            />
          )}

          {stage === 'success' && <SuccessScreen key="qw-success" successRef={successRef} />}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

const REVIEW_ORDER: Array<keyof WizardData> = [
  'agency',
  'contact',
  'email',
  'phone',
  'country',
  'packageCode',
  'travelDates',
  'pax',
  'groupType',
  'message',
];

function ReviewScreen({
  data,
  onBack,
  onSubmit,
  submitting,
  error,
  direction,
}: {
  data: WizardData;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
  direction: number;
}) {
  const rows = REVIEW_ORDER.filter((key) => {
    const v = data[key];
    return typeof v === 'string' && v.trim().length > 0;
  }).map((key) => [LABELS[key], data[key] as string] as const);

  return (
    <motion.div
      custom={direction}
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -48 }}
      transition={{ duration: 0.32, ease: EASE }}
      className="qw-step qw-review"
    >
      <p className="qw-step-count">Review your inquiry</p>
      <h3 className="qw-step-title">Ready to send?</h3>
      <p className="qw-step-helper">Take a quick look before it goes to our team.</p>

      <dl className="qw-review-list">
        {rows.map(([label, value]) => (
          <div key={label} className="qw-review-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {error && (
        <p className="qw-step-error" role="alert">
          {error}
        </p>
      )}

      <div className="qw-step-actions">
        <Button type="button" variant="secondary" size="sm" onClick={onBack} disabled={submitting}>
          <Icon name="arrow" size={15} className="rotate-180" /> Back
        </Button>
        <Button type="button" size="sm" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Sending…' : 'Send inquiry'} {!submitting && <Icon name="arrow" size={15} />}
        </Button>
      </div>
    </motion.div>
  );
}

function SuccessScreen({ successRef }: { successRef: React.RefObject<HTMLDivElement | null> }) {
  // AnimatePresence mode="wait" means this component doesn't mount until the
  // review screen's exit transition finishes — a `[stage]`-keyed effect in
  // the parent would fire (and read a still-null ref) well before that. A
  // mount-time effect here is guaranteed to run after this DOM node exists.
  useEffect(() => {
    successRef.current?.focus();
    successRef.current?.scrollIntoView({ block: 'center' });
  }, [successRef]);

  return (
    <motion.div
      ref={successRef}
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="qw-step qw-success"
      role="status"
    >
      <div className="qw-success-icon">
        <Icon name="check" size={22} />
      </div>
      <h3 className="qw-step-title">Thank you — inquiry received</h3>
      <p className="qw-step-helper">
        Our team will get back to you with a tailored quote, usually within one business day.
      </p>
      <p className="qw-success-links">
        While you wait:{' '}
        <Link to="/tours" viewTransition>
          browse the six tour packages
        </Link>{' '}
        or{' '}
        <Link to="/services" viewTransition>
          see our ground services
        </Link>
        .
      </p>
    </motion.div>
  );
}

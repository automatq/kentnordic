import { Suspense, lazy, useState } from 'react';
import InquiryForm from '@/components/react/InquiryForm';
import { cn } from '@/lib/classNames';

const QuoteWizard = lazy(() => import('@/components/react/QuoteWizard'));

interface PackageOption {
  code: string;
  name: string;
}

interface RequestQuoteFormProps {
  packages: PackageOption[];
  endpoint: string;
}

/**
 * The /contact quote form: the classic all-fields form by default (works
 * without JS beyond hydration, the safe fallback), with an opt-in guided
 * one-question-at-a-time wizard. Both submit through the same provider.
 */
export default function RequestQuoteForm({ packages, endpoint }: RequestQuoteFormProps) {
  const [mode, setMode] = useState<'quick' | 'guided'>('quick');

  return (
    <div className="rx">
      <div className="rx-toggle" role="tablist" aria-label="Quote form style">
        <button type="button" role="tab" aria-selected={mode === 'quick'} className={cn('rx-tab', mode === 'quick' && 'is-active')} onClick={() => setMode('quick')}>
          Quick form
        </button>
        <button type="button" role="tab" aria-selected={mode === 'guided'} className={cn('rx-tab', mode === 'guided' && 'is-active')} onClick={() => setMode('guided')}>
          Guided quote wizard
          <span className="rx-tab-badge">New</span>
        </button>
      </div>
      {mode === 'guided' ? (
        <Suspense fallback={<p className="qw-loading">Loading the guided wizard…</p>}>
          <QuoteWizard packages={packages} />
        </Suspense>
      ) : (
        <InquiryForm packages={packages} endpoint={endpoint} />
      )}
    </div>
  );
}

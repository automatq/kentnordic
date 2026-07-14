import { Suspense, useEffect, useState } from 'react';
import { useInViewport } from '@/lib/useInViewport';
import { cn } from '@/lib/classNames';

interface DeferredContentProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
  rootMargin?: string;
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="deferred-content-placeholder" role="status">
      {label}
    </div>
  );
}

/**
 * Reserves space for a below-fold experience and mounts its lazy child once
 * the section is approaching the viewport. Once mounted, the child remains
 * alive so interaction state is not lost when the user scrolls away.
 */
export default function DeferredContent({
  children,
  className,
  label = 'Loading interactive route…',
  rootMargin = '800px 0px',
}: DeferredContentProps) {
  const [hostRef, inView] = useInViewport<HTMLDivElement>(rootMargin);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

  return (
    <div ref={hostRef} className={cn('deferred-content', className)}>
      {hasEntered ? <Suspense fallback={<Placeholder label={label} />}>{children}</Suspense> : <Placeholder label={label} />}
    </div>
  );
}

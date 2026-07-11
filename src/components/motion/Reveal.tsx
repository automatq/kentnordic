import { cn } from '@/lib/classNames';

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  delay?: number;
}

/** Thin wrapper over the `.u-reveal` / `data-reveal-delay` mechanism in lib/motion.ts. */
export default function Reveal({ as: Tag = 'div', delay = 0, className, children, ...rest }: RevealProps) {
  return (
    <Tag className={cn('u-reveal', className)} data-reveal-delay={delay || undefined} {...rest}>
      {children}
    </Tag>
  );
}

import { cn } from '@/lib/classNames';

interface ContainerProps {
  as?: React.ElementType;
  narrow?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function Container({ as = 'div', narrow = false, className, children }: ContainerProps) {
  // @react-three/fiber augments React's JSX intrinsics, which makes bare
  // ElementType rendering collapse to never — pin the accepted props instead.
  const Tag = as as React.FC<{ className?: string; children?: React.ReactNode }>;
  return <Tag className={cn('u-container', narrow && 'u-container-narrow', className)}>{children}</Tag>;
}

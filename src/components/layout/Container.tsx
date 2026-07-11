import { cn } from '@/lib/classNames';

interface ContainerProps {
  as?: React.ElementType;
  narrow?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function Container({ as: Tag = 'div', narrow = false, className, children }: ContainerProps) {
  return <Tag className={cn('u-container', narrow && 'u-container-narrow', className)}>{children}</Tag>;
}

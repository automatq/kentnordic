import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, total > 0 ? current / total : 0));
  return (
    <div className="qw-progress" aria-hidden="true">
      <motion.div
        className="qw-progress-fill"
        initial={false}
        animate={{ scaleX: pct }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

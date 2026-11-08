interface ProgressBarProps {
  value: number; // 0..1
  label: string; // read by screen readers
  className?: string;
}

export function ProgressBar({ value, label, className = "" }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`progress-track h-2 ${className}`}
    >
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

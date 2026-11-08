import type { CSSProperties } from "react";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string; // read by screen readers
  unit?: string; // shown in the bubble and read out: "12 XP"
  ticks?: readonly number[]; // marks on the track, e.g. where a bonus starts
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  onChange: (value: number) => void;
}

// A native range input, so keyboard, touch and screen readers work for free. The look
// comes from .slider in components.css. --slider-fraction drives the fill and bubble.
export function Slider({
  value,
  min,
  max,
  step = 1,
  label,
  unit = "",
  ticks = [],
  disabled,
  invalid,
  id,
  className = "",
  onChange,
}: SliderProps) {
  const clamped = Math.min(max, Math.max(min, value));
  const fractionOf = (n: number) => (max === min ? 0 : (n - min) / (max - min));
  const text = unit ? `${clamped} ${unit}` : String(clamped);

  return (
    <div className={`slider ${className}`} style={{ "--slider-fraction": fractionOf(clamped) } as CSSProperties}>
      {ticks.map((tick) => (
        <span
          key={tick}
          aria-hidden="true"
          data-reached={tick <= clamped ? "true" : undefined}
          className="slider-tick"
          style={{ "--slider-fraction": fractionOf(tick) } as CSSProperties}
        />
      ))}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={text}
        aria-invalid={invalid ? true : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output aria-hidden="true" className="slider-bubble">
        {text}
      </output>
    </div>
  );
}

interface SliderFieldProps extends Omit<SliderProps, "label" | "id"> {
  id: string;
  label: string;
  error?: string;
}

// Label, current value, slider, range ends and error message.
export function SliderField({ id, label, error, ...slider }: SliderFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span aria-hidden="true" className="slider-value">
          {slider.value}
          {slider.unit ? ` ${slider.unit}` : ""}
        </span>
      </div>
      <Slider id={id} label={label} invalid={Boolean(error)} {...slider} />
      <div aria-hidden="true" className="flex justify-between text-xs text-muted-foreground">
        <span>{slider.min}</span>
        <span>{slider.max}</span>
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

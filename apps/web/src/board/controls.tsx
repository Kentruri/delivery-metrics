import { CaretDown } from "@phosphor-icons/react";

interface Option<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export const SegmentedControl = <T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) => (
  <fieldset className="flex rounded-control border border-line bg-panel p-0.5">
    <legend className="sr-only">{legend}</legend>
    {options.map((option) => (
      <label
        key={option.value}
        className={option.disabled ? "cursor-not-allowed" : "cursor-pointer"}
      >
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={option.value === value}
          disabled={option.disabled}
          onChange={() => onChange(option.value)}
          className="peer sr-only"
        />
        <span className="block rounded-inset px-3 py-1.5 text-[13px] font-semibold text-body transition-[background-color,color,scale] duration-150 ease-out peer-checked:bg-ink peer-checked:text-panel peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink peer-disabled:pointer-events-none peer-disabled:text-muted/50 hover:text-ink motion-safe:active:scale-[0.97] peer-checked:hover:text-panel">
          {option.label}
        </span>
      </label>
    ))}
  </fieldset>
);

interface SelectFieldProps<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export const SelectField = <T extends string>({
  label,
  options,
  value,
  onChange,
}: SelectFieldProps<T>) => (
  <label className="flex items-center gap-2 text-[13px] text-muted">
    {label}
    <span className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="appearance-none rounded-control border border-line bg-panel py-1.5 pr-8 pl-2.5 text-[13px] font-semibold text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={12}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink"
      />
    </span>
  </label>
);

interface DateFieldProps {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
}

export const DateField = ({ label, value, min, max, onChange }: DateFieldProps) => (
  <label className="flex items-center gap-2 text-[13px] text-muted">
    {label}
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      required
      onChange={(event) => onChange(event.target.value)}
      className="rounded-control border border-line bg-panel px-2.5 py-[5px] text-[13px] font-semibold text-ink tabular-nums"
    />
  </label>
);

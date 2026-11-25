import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";

const FALLBACK_WIDTH = 600;
const TOOLTIP_WIDTH = 176;
const COUNT_STEPS = [
  1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400,
  500,
];

export const niceCeiling = (value: number) =>
  COUNT_STEPS.find((step) => step >= value) ?? Math.ceil(value);

export const useMeasuredWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    setWidth(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width || FALLBACK_WIDTH] as const;
};

export const usePatternId = () => `hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

export const HatchPattern = ({ id }: { id: string }) => (
  <defs>
    <pattern
      id={id}
      width="6"
      height="6"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <line x1="0" y1="0" x2="0" y2="6" strokeWidth="1" className="stroke-line-strong" />
    </pattern>
  </defs>
);

// A column grows from the baseline with 4px rounded data-ends.
export const columnPath = (centre: number, width: number, top: number, bottom: number) => {
  const height = bottom - top;
  if (height <= 0) {
    return "";
  }
  const x = centre - width / 2;
  const r = Math.min(4, width / 2, height);
  return `M${x} ${bottom}V${top + r}A${r} ${r} 0 0 1 ${x + r} ${top}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${top + r}V${bottom}Z`;
};

export const Tooltip = ({
  x,
  width,
  children,
}: {
  x: number;
  width: number;
  children: ReactNode;
}) => {
  const left = x + 12 + TOOLTIP_WIDTH > width ? x - 12 - TOOLTIP_WIDTH : x + 12;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1 z-10 w-44 space-y-0.5 rounded-block border border-line bg-panel px-3 py-2 text-[12px] leading-snug text-body"
      style={{ left: Math.max(0, left) }}
    >
      {children}
    </div>
  );
};

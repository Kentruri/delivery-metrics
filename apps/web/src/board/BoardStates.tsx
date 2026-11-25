import { Info } from "@phosphor-icons/react";
import { CloudnonicMark } from "../brand/CloudnonicMark";
import { listJoin } from "./format";

export const SourcesNotice = ({ hosts }: { hosts: string[] }) => {
  const unique = [...new Set(hosts)];
  if (unique.length === 0) {
    return null;
  }
  return (
    <p className="border-b border-line bg-highlight">
      <span className="mx-auto flex max-w-[1240px] items-start gap-2 px-4 py-2 text-[13px] text-ink sm:px-6">
        <Info size={16} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
        {listJoin(unique)} {unique.length === 1 ? "is" : "are"} not connected yet: deploys come from
        GitHub merges, and conflicts with the host cannot be checked.
      </span>
    </p>
  );
};

const BARS = [
  { key: "headline-1", className: "h-9 w-[92%]" },
  { key: "headline-2", className: "h-9 w-[74%]" },
  { key: "headline-3", className: "h-9 w-[48%]" },
];
const LINES = [
  { key: "claim-1", className: "w-full" },
  { key: "claim-2", className: "w-[86%]" },
  { key: "claim-3", className: "w-[94%]" },
  { key: "claim-4", className: "w-[62%]" },
];

export const BoardSkeleton = () => (
  <div>
    <p role="status" className="sr-only">
      Loading the history
    </p>
    <div aria-hidden className="grid gap-6 lg:grid-cols-12 lg:gap-10">
      <div className="space-y-3 lg:col-span-6">
        {BARS.map((bar) => (
          <div key={bar.key} className={`rounded-inset bg-highlight ${bar.className}`} />
        ))}
      </div>
      <div className="space-y-3 lg:col-span-6 lg:pt-2">
        {LINES.map((line) => (
          <div key={line.key} className={`h-4 rounded-inset bg-highlight ${line.className}`} />
        ))}
      </div>
    </div>
    <div aria-hidden className="mt-12 divide-y divide-line border-y border-line">
      {["row-1", "row-2", "row-3"].map((row) => (
        <div key={row} className="flex items-center gap-6 px-3 py-5">
          <div className="h-4 w-48 rounded-inset bg-highlight" />
          <div className="h-4 w-28 rounded-inset bg-highlight" />
          <div className="h-1 flex-1 rounded-inset bg-highlight" />
        </div>
      ))}
    </div>
  </div>
);

export const BoardError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div role="alert" className="rounded-panel border border-dashed border-line-strong px-5 py-8">
    <p className="font-semibold text-ink">The history did not load.</p>
    <p className="mt-1 text-[14px] text-body">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-4 rounded-control border border-line bg-panel px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors duration-150 ease-out hover:bg-highlight"
    >
      Try again
    </button>
  </div>
);

export const Unreachable = ({ onRetry }: { onRetry: () => void }) => (
  <main className="grid min-h-dvh place-items-center px-4 py-10">
    <div className="w-full max-w-[23rem]">
      <p className="flex items-center gap-2.5 text-ink">
        <CloudnonicMark className="h-[18px] w-auto" />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Delivery Metrics</span>
      </p>
      <div className="mt-6">
        <BoardError
          message="The API is not answering. It may be waking up; try again in a minute."
          onRetry={onRetry}
        />
      </div>
    </div>
  </main>
);

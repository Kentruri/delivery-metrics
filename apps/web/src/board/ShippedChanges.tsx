import { ArrowSquareOut, CaretRight } from "@phosphor-icons/react";
import { pullUrl } from "./fromApi";
import type { DeployChanges } from "./model";

const KIND_LABEL = { feature: "Feature", fix: "Fix" } as const;

const lowerFirst = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

const preview = ({ items, internalCount }: DeployChanges) => {
  const [first, second] = items;
  const rest = items.length - 2;
  if (!first) {
    return `${internalCount} internal ${internalCount === 1 ? "change" : "changes"}`;
  }
  if (!second) {
    return first.title;
  }
  return rest > 0
    ? `${first.title}, ${lowerFirst(second.title)} and ${rest} more`
    : `${first.title} and ${lowerFirst(second.title)}`;
};

export const ShippedChanges = ({ changes, repo }: { changes: DeployChanges; repo: string }) => {
  const { items, internalCount } = changes;
  if (items.length === 0 && internalCount === 0) {
    return null;
  }

  const count = items.length + internalCount;
  return (
    <details className="group sm:col-span-full">
      <summary className="flex cursor-pointer list-none items-start gap-2 rounded-inset text-[14px] text-body [&::-webkit-details-marker]:hidden">
        <CaretRight
          size={14}
          weight="bold"
          aria-hidden
          className="mt-[3px] shrink-0 text-muted group-open:rotate-90 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
        />
        <span>
          {preview(changes)}{" "}
          <span className="text-muted">
            ({count} {count === 1 ? "change" : "changes"})
          </span>
        </span>
      </summary>
      <ul className="mt-2 space-y-1.5 pl-[22px]">
        {items.map((item) => (
          <li
            key={item.pullNumber}
            className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-2 text-[13px]"
          >
            <span className="font-semibold text-muted">{KIND_LABEL[item.kind]}</span>
            <span className="text-body">
              {item.title}
              {item.ticket && <span className="text-muted"> {item.ticket}</span>}{" "}
              <a
                href={pullUrl(repo, item.pullNumber)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 rounded-inset font-medium text-ink underline decoration-line-strong transition-[text-decoration-color] duration-150 ease-out hover:decoration-ink"
              >
                #{item.pullNumber}
                <ArrowSquareOut size={12} weight="bold" aria-hidden />
                <span className="sr-only">(opens GitHub)</span>
              </a>
            </span>
          </li>
        ))}
        {internalCount > 0 && (
          <li className="text-[13px] text-muted">
            Plus {internalCount} internal {internalCount === 1 ? "change" : "changes"}: refactors,
            chores, CI and tooling.
          </li>
        )}
      </ul>
    </details>
  );
};

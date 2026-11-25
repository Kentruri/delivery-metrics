import type { ReactNode } from "react";
import { CadenceChart, LeadTimeChart, Outcomes, ShippedBars } from "./charts";
import {
  type Claim,
  cadenceClaim,
  capitalize,
  currentLabel,
  failureClaim,
  leadTimeClaim,
  previousPhrase,
  productionOnlyClaim,
  shippedClaim,
} from "./claims";
import type { PeriodFilters, PeriodReport } from "./model";

const Row = ({ claim, children }: { claim: Claim; children?: ReactNode }) => (
  <div className="grid gap-4 px-5 py-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
    <p className="text-[15px] leading-relaxed text-body">
      {claim.map((part) =>
        part.strong ? (
          <strong key={part.text} className="font-semibold text-ink">
            {part.text}
          </strong>
        ) : (
          part.text
        ),
      )}
    </p>
    {children && <div className="min-w-0">{children}</div>}
  </div>
);

interface PeriodRowsProps {
  report: PeriodReport;
  filters: PeriodFilters;
  production: boolean;
}

export const PeriodRows = ({ report, filters, production }: PeriodRowsProps) => {
  const phrase = previousPhrase(filters, report);
  const labels = { currentLabel: currentLabel(filters), previousLabel: capitalize(phrase) };
  return (
    <div className="divide-y divide-line">
      <Row claim={cadenceClaim(report, phrase)}>
        <CadenceChart report={report} {...labels} />
      </Row>
      {production ? (
        <Row claim={leadTimeClaim(report, phrase)}>
          <LeadTimeChart report={report} previousLabel={labels.previousLabel} />
        </Row>
      ) : (
        <Row claim={productionOnlyClaim("Lead time")} />
      )}
      {production ? (
        <Row claim={failureClaim(report, phrase)}>
          <Outcomes report={report} />
        </Row>
      ) : (
        <Row claim={productionOnlyClaim("The failure rate")} />
      )}
      <Row claim={shippedClaim(report, phrase)}>
        <ShippedBars report={report} />
      </Row>
    </div>
  );
};

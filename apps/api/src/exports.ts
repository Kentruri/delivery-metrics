import { type Conflict, type Deploy, outcomeAt, percentile } from "@cloudnonic/delivery-contracts";

const cell = (value: string | number | boolean | null) => {
  const text = value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (header: string[], rows: (string | number | boolean | null)[][]) =>
  `${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;

const round = (value: number) => Math.round(value * 10) / 10;

const leadTime = (hours: number[]) => {
  if (hours.length === 0) {
    return { median: null, p85: null };
  }
  const sorted = [...hours].sort((a, b) => a - b);
  return { median: round(percentile(sorted, 0.5)), p85: round(percentile(sorted, 0.85)) };
};

const outcomeOf = (deploy: Deploy, now: number) => {
  if (deploy.environment !== "production" || !deploy.counted) {
    return { outcome: "", reason: "" };
  }
  const outcome = outcomeAt(
    {
      finishedAt: Date.parse(deploy.finishedAt),
      hotfixAt: deploy.hotfixAt ? Date.parse(deploy.hotfixAt) : null,
      rollbackAt: deploy.rollbackAt ? Date.parse(deploy.rollbackAt) : null,
    },
    now,
  );
  return { outcome: outcome.kind, reason: outcome.kind === "failed" ? outcome.reason : "" };
};

export const deploysCsv = (deploys: Deploy[], conflicts: Conflict[], now: number) => {
  const details = new Map(conflicts.map((conflict) => [conflict.id, conflict.detail]));
  const rows = deploys.map((deploy) => {
    const lead = leadTime(deploy.leadTimesHours);
    const { outcome, reason } = outcomeOf(deploy, now);
    return [
      deploy.finishedAt,
      deploy.repo,
      deploy.environment,
      deploy.source,
      deploy.status,
      deploy.kind,
      deploy.counted,
      deploy.version,
      deploy.sha,
      deploy.triggeredBy,
      deploy.pullNumber,
      deploy.title,
      lead.median,
      lead.p85,
      outcome,
      reason,
      deploy.conflict,
      deploy.conflict ? (details.get(deploy.id) ?? "") : "",
    ];
  });
  for (const conflict of conflicts.filter((item) => item.kind === "tag_without_deploy")) {
    rows.push([
      conflict.at,
      conflict.repo,
      conflict.environment,
      "GitHub",
      "not deployed",
      "release tag",
      false,
      conflict.ref.replace(/^v/, ""),
      null,
      null,
      null,
      conflict.ref,
      null,
      null,
      "",
      "",
      conflict.kind,
      conflict.detail,
    ]);
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return toCsv(
    [
      "finished_at_utc",
      "repo",
      "environment",
      "source",
      "status",
      "kind",
      "counted",
      "version",
      "sha",
      "triggered_by",
      "pull_request",
      "title",
      "lead_time_median_hours",
      "lead_time_p85_hours",
      "outcome",
      "failure_reason",
      "conflict",
      "conflict_detail",
    ],
    rows,
  );
};

interface MonthTotals {
  deploys: number;
  days: Set<string>;
  hours: number[];
  failed: number;
  finished: number;
}

// One row per month, repo and environment, plus "all" repos; months in UTC.
export const summaryCsv = (deploys: Deploy[], now: number) => {
  const totals = new Map<string, MonthTotals>();
  for (const deploy of deploys) {
    if (!deploy.counted) {
      continue;
    }
    const month = deploy.finishedAt.slice(0, 7);
    for (const repo of [deploy.repo, "all"]) {
      const key = `${month}|${repo}|${deploy.environment}`;
      const entry = totals.get(key) ?? {
        deploys: 0,
        days: new Set(),
        hours: [],
        failed: 0,
        finished: 0,
      };
      entry.deploys += 1;
      entry.days.add(deploy.finishedAt.slice(0, 10));
      entry.hours.push(...deploy.leadTimesHours);
      const { outcome } = outcomeOf(deploy, now);
      if (outcome === "failed" || outcome === "clean") {
        entry.finished += 1;
        entry.failed += outcome === "failed" ? 1 : 0;
      }
      totals.set(key, entry);
    }
  }
  const rows = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => {
      const [month, repo, environment] = key.split("|");
      const lead = leadTime(entry.hours);
      const production = environment === "production";
      return [
        month ?? "",
        repo ?? "",
        environment ?? "",
        entry.deploys,
        entry.days.size,
        lead.median,
        lead.p85,
        production ? entry.failed : null,
        production ? entry.finished : null,
        production && entry.finished > 0 ? round((entry.failed / entry.finished) * 100) : null,
      ];
    });
  return toCsv(
    [
      "month_utc",
      "repo",
      "environment",
      "deploys",
      "release_days",
      "lead_time_median_hours",
      "lead_time_p85_hours",
      "failed",
      "finished_watches",
      "failure_rate_percent",
    ],
    rows,
  );
};

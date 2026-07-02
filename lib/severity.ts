export const SEVERITY_ORDER = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN",
] as const;

export type Severity = (typeof SEVERITY_ORDER)[number];

export interface SeverityStyle {
  label: string;
  badge: string;
  dot: string;
}

export const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
  CRITICAL: {
    label: "Critical",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
    dot: "bg-red-600",
  },
  HIGH: {
    label: "High",
    badge:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  MEDIUM: {
    label: "Medium",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low",
    badge:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  UNKNOWN: {
    label: "Unknown",
    badge:
      "border-border bg-muted text-muted-foreground",
    dot: "bg-gray-400",
  },
};

export function normalizeSeverity(severity: string | undefined): Severity {
  const upper = severity?.toUpperCase();
  return (SEVERITY_ORDER as readonly string[]).includes(upper ?? "")
    ? (upper as Severity)
    : "UNKNOWN";
}

export function severityRank(severity: string | undefined): number {
  return SEVERITY_ORDER.indexOf(normalizeSeverity(severity));
}

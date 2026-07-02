"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Search, SearchX } from "lucide-react";
import { CVE, ProductData } from "@/types";
import Link from "next/link";
import ProductHeader from "./productHeader";
import {
  SEVERITY_ORDER,
  SEVERITY_STYLES,
  Severity,
  normalizeSeverity,
  severityRank,
} from "@/lib/severity";
import { cn } from "@/lib/utils";

function SeverityBadge({ severity }: { severity: string }) {
  const normalized = normalizeSeverity(severity);
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", SEVERITY_STYLES[normalized].badge)}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          SEVERITY_STYLES[normalized].dot
        )}
      />
      {SEVERITY_STYLES[normalized].label}
    </Badge>
  );
}

const VERSION_PREVIEW_COUNT = 6;

function VersionList({
  versions,
  expanded,
  onToggle,
}: {
  versions: string[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (versions.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const visible = expanded
    ? versions
    : versions.slice(0, VERSION_PREVIEW_COUNT);
  const hiddenCount = versions.length - VERSION_PREVIEW_COUNT;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((version) => (
        <span
          key={version}
          className="rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] leading-4"
        >
          {version}
        </span>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-0.5 rounded-md border border-dashed px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="size-3" />
            </>
          ) : (
            <>
              +{hiddenCount} more <ChevronDown className="size-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function maxScore(cve: CVE): number {
  return Math.max(
    cve.CVSS?.nvd?.V3Score ?? cve.CVSS?.nvd?.V2Score ?? 0,
    cve.CVSS?.redhat?.V3Score ?? cve.CVSS?.redhat?.V2Score ?? 0
  );
}

export default function CVETable({
  slug,
  productData,
}: {
  slug: string;
  productData: ProductData | null;
}) {
  const [query, setQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | null>(
    null
  );
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>(
    {}
  );

  const allCVEs = useMemo(
    () => Object.entries(productData?.cveData ?? {}),
    [productData]
  );

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      UNKNOWN: 0,
    };
    allCVEs.forEach(([, cve]) => {
      counts[normalizeSeverity(cve.Severity)] += 1;
    });
    return counts;
  }, [allCVEs]);

  const filteredCVEs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allCVEs
      .filter(([cveId, cve]) => {
        if (
          selectedSeverity &&
          normalizeSeverity(cve.Severity) !== selectedSeverity
        ) {
          return false;
        }
        if (!needle) return true;
        return [cveId, cve.Title, cve.Description, cve.PkgName]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        const bySeverity =
          severityRank(a[1].Severity) - severityRank(b[1].Severity);
        if (bySeverity !== 0) return bySeverity;
        return maxScore(b[1]) - maxScore(a[1]);
      });
  }, [allCVEs, query, selectedSeverity]);

  const toggleExpand = (cveId: string) => {
    setExpandedRows((prev) => ({ ...prev, [cveId]: !prev[cveId] }));
  };

  const hasActiveFilter = query.trim() !== "" || selectedSeverity !== null;

  if (!productData) {
    return <p className="text-muted-foreground">Product not found.</p>;
  }

  return (
    <>
      <ProductHeader
        slug={slug}
        name={productData.name}
        dockerImage={productData.dockerImage}
        date={productData.date}
        active="cve"
      />

      <Card className="w-full">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search CVE, package, description…"
                aria-label="Search CVEs"
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div
              role="group"
              aria-label="Filter by severity"
              className="flex flex-wrap items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => setSelectedSeverity(null)}
                aria-pressed={selectedSeverity === null}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium tabular-nums transition-colors",
                  selectedSeverity === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                All {allCVEs.length}
              </button>
              {SEVERITY_ORDER.filter(
                (severity) =>
                  severity !== "UNKNOWN" || severityCounts[severity] > 0
              ).map((severity) => (
                <button
                  key={severity}
                  type="button"
                  onClick={() =>
                    setSelectedSeverity(
                      selectedSeverity === severity ? null : severity
                    )
                  }
                  aria-pressed={selectedSeverity === severity}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium tabular-nums transition-colors",
                    selectedSeverity === severity
                      ? SEVERITY_STYLES[severity].badge
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      SEVERITY_STYLES[severity].dot
                    )}
                  />
                  {SEVERITY_STYLES[severity].label}{" "}
                  {severityCounts[severity]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground" aria-live="polite">
            Showing {filteredCVEs.length} of {allCVEs.length} vulnerabilities
          </p>

          {filteredCVEs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
              <SearchX className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No CVEs match your filters</p>
              <p className="text-xs text-muted-foreground">
                Try a different search term or severity.
              </p>
              {hasActiveFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setQuery("");
                    setSelectedSeverity(null);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <Table className="min-w-[1100px] table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[15%]">CVE / Package</TableHead>
                  <TableHead className="w-[31%]">Description</TableHead>
                  <TableHead className="w-[9%]">Severity</TableHead>
                  <TableHead className="w-[9%]">CVSS</TableHead>
                  <TableHead className="w-[18%]">Affected versions</TableHead>
                  <TableHead className="w-[18%]">Fixed / not affected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCVEs.map(([cveId, cve]) => (
                  <TableRow key={cveId}>
                    <TableCell className="whitespace-normal break-words align-top">
                      <Link
                        href={`/${slug}/cve/${cveId}`}
                        className="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {cveId}
                      </Link>
                      {cve.PkgName && (
                        <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                          {cve.PkgName}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words align-top">
                      {cve.Title && (
                        <p className="text-sm font-medium leading-5">
                          {cve.Title}
                        </p>
                      )}
                      <p
                        className={cn(
                          "text-xs leading-5 text-muted-foreground",
                          !expandedRows[cveId] && "line-clamp-3"
                        )}
                      >
                        {cve.Description}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <SeverityBadge severity={cve.Severity} />
                    </TableCell>
                    <TableCell className="align-top text-xs leading-5">
                      <p className="whitespace-nowrap tabular-nums">
                        <span className="text-muted-foreground">NVD</span>{" "}
                        {cve.CVSS?.nvd?.V3Score ??
                          cve.CVSS?.nvd?.V2Score ??
                          "n/a"}
                      </p>
                      <p className="whitespace-nowrap tabular-nums">
                        <span className="text-muted-foreground">RedHat</span>{" "}
                        {cve.CVSS?.redhat?.V3Score ??
                          cve.CVSS?.redhat?.V2Score ??
                          "n/a"}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal align-top">
                      <VersionList
                        versions={cve.affected_versions}
                        expanded={!!expandedRows[cveId]}
                        onToggle={() => toggleExpand(cveId)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-normal align-top">
                      <VersionList
                        versions={cve.not_affected_versions}
                        expanded={!!expandedRows[cveId]}
                        onToggle={() => toggleExpand(cveId)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

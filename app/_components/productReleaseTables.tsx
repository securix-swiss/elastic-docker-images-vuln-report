"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { ProductData } from "@/types";
import ProductHeader from "./productHeader";
import {
  SEVERITY_ORDER,
  SEVERITY_STYLES,
  Severity,
  normalizeSeverity,
} from "@/lib/severity";
import { cn, formatDate } from "@/lib/utils";

function emptySeverityCounts(): Record<Severity, number> {
  return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
}

export default function ReleaseTable({
  slug,
  productData,
}: {
  slug: string;
  productData: ProductData | null;
}) {
  const [query, setQuery] = useState("");

  // Invert the CVE -> affected_versions mapping so each release row can show
  // how many CVEs (per severity) affect that version.
  const countsByVersion = useMemo(() => {
    const counts: Record<string, Record<Severity, number>> = {};
    Object.values(productData?.cveData ?? {}).forEach((cve) => {
      const severity = normalizeSeverity(cve.Severity);
      cve.affected_versions.forEach((version) => {
        counts[version] ??= emptySeverityCounts();
        counts[version][severity] += 1;
      });
    });
    return counts;
  }, [productData]);

  const releases = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (productData?.releases ?? []).filter((release) =>
      release.version.toLowerCase().includes(needle)
    );
  }, [productData, query]);

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
        active="releases"
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
                placeholder="Filter versions, e.g. 8.15…"
                aria-label="Filter releases"
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
              Showing {releases.length} of {productData.releases.length}{" "}
              releases
            </p>
          </div>

          {releases.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
              <SearchX className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No releases match your filter</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Version</TableHead>
                  <TableHead>Release date</TableHead>
                  <TableHead>Open CVEs</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((release) => {
                  const counts =
                    countsByVersion[release.version] ?? emptySeverityCounts();
                  const total = SEVERITY_ORDER.reduce(
                    (sum, severity) => sum + counts[severity],
                    0
                  );
                  return (
                    <TableRow key={release.version}>
                      <TableCell className="font-mono text-xs font-medium">
                        <Link
                          href={`/${slug}/versions/${release.version}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {release.version}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(release.published_at)}
                      </TableCell>
                      <TableCell>
                        {total === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            None known
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {SEVERITY_ORDER.filter(
                              (severity) => counts[severity] > 0
                            ).map((severity) => (
                              <span
                                key={severity}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
                                  SEVERITY_STYLES[severity].badge
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    SEVERITY_STYLES[severity].dot
                                  )}
                                />
                                {counts[severity]}{" "}
                                {SEVERITY_STYLES[severity].label}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/${slug}/versions/${release.version}`}
                          aria-label={`View CVEs for version ${release.version}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {total} CVE{total === 1 ? "" : "s"}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

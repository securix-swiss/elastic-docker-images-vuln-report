import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, ExternalLink, ShieldAlert } from "lucide-react";
import { CVE } from "@/types";
import path from "path";
import fs from "fs";
import { SEVERITY_STYLES, normalizeSeverity } from "@/lib/severity";
import { capitalize, cn, formatDate } from "@/lib/utils";

async function loadCVEData(
  product: string,
  cveName: string
): Promise<CVE | null> {
  const dataPath = path.join(process.cwd(), "data/results", `${product}.json`);
  try {
    const fileContent = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(fileContent).cveData[cveName];
  } catch (error) {
    console.error(
      `Error loading file for product ${product} and cve ${cveName}:`,
      error
    );
    return null;
  }
}

export async function generateStaticParams() {
  const dataPath = path.join(process.cwd(), "data/results");

  // Read all product files in the directory
  const productFiles = fs.readdirSync(dataPath).filter((file) => {
    const filePath = path.join(dataPath, file);
    return fs.statSync(filePath).isFile() && file.endsWith(".json");
  });

  // Generate paths for each product and its CVEs
  const params = productFiles.flatMap((file) => {
    const product = file.replace(".json", ""); // Remove the .json extension
    const fileContent = fs.readFileSync(path.join(dataPath, file), "utf8");
    const cveData = JSON.parse(fileContent).cveData;

    return Object.keys(cveData).map((cveName) => ({
      product,
      cveName,
    }));
  });

  return params;
}

function VersionChips({ versions }: { versions: string[] }) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">None</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {versions.map((version) => (
        <span
          key={version}
          className="rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-xs"
        >
          {version}
        </span>
      ))}
    </div>
  );
}

export default async function CVEPage({
  params,
}: {
  params: Promise<{ product: string; cveName: string }>;
}) {
  const { product, cveName } = await params;
  const cve = await loadCVEData(product, cveName);

  if (!cve) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-lg font-medium">CVE not found</p>
        <Button variant="outline" asChild>
          <Link href={`/${product}/cve`}>Back to {capitalize(product)} CVEs</Link>
        </Button>
      </div>
    );
  }

  const severity = normalizeSeverity(cve.Severity);

  const scores = [
    {
      label: "NVD",
      v3: cve.CVSS?.nvd?.V3Score,
      v2: cve.CVSS?.nvd?.V2Score,
    },
    {
      label: "RedHat",
      v3: cve.CVSS?.redhat?.V3Score,
      v2: cve.CVSS?.redhat?.V2Score,
    },
  ];

  const references = cve.References ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/" className="transition-colors hover:text-foreground">
          Overview
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          href={`/${product}/cve`}
          className="transition-colors hover:text-foreground"
        >
          {capitalize(product)}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{cveName}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              {cveName}
            </h1>
            <Badge
              variant="outline"
              className={cn("gap-1.5", SEVERITY_STYLES[severity].badge)}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  SEVERITY_STYLES[severity].dot
                )}
              />
              {SEVERITY_STYLES[severity].label}
            </Badge>
          </div>
          {cve.Title && (
            <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
              {cve.Title}
            </p>
          )}
        </div>
        {cve.PrimaryURL && (
          <Button variant="outline" size="sm" asChild>
            <a href={cve.PrimaryURL} target="_blank" rel="noopener noreferrer">
              Vulnerability database
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Package
            </p>
            <p className="mt-1 break-all font-mono text-sm font-medium">
              {cve.PkgName ?? "n/a"}
            </p>
            {cve.InstalledVersion && (
              <p className="break-all font-mono text-xs text-muted-foreground">
                {cve.InstalledVersion}
              </p>
            )}
          </CardContent>
        </Card>
        {scores.map((score) => (
          <Card key={score.label} className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                CVSS {score.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {score.v3 ?? score.v2 ?? "n/a"}
              </p>
              <p className="text-xs text-muted-foreground">
                {score.v3 ? "v3 score" : score.v2 ? "v2 score" : "not rated"}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Published
            </p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(cve.PublishedDate)}
            </p>
            {cve.LastModifiedDate && (
              <p className="text-xs text-muted-foreground">
                Modified {formatDate(cve.LastModifiedDate)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            {cve.Description}
          </p>
          {cve.CweIDs && cve.CweIDs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Weakness:</span>
              {cve.CweIDs.map((cwe) => (
                <Badge key={cwe} variant="outline" className="font-mono">
                  {cwe}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-red-600 dark:text-red-400" />
              Affected versions
              <span className="ml-auto text-sm font-normal tabular-nums text-muted-foreground">
                {cve.affected_versions.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VersionChips versions={cve.affected_versions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              Not affected versions
              <span className="ml-auto text-sm font-normal tabular-nums text-muted-foreground">
                {cve.not_affected_versions.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VersionChips versions={cve.not_affected_versions} />
          </CardContent>
        </Card>
      </div>

      {references.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              References
              <span className="ml-2 text-sm font-normal tabular-nums text-muted-foreground">
                {references.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {references.map((reference) => (
                <li key={reference} className="flex items-start gap-2">
                  <ExternalLink className="mt-1 size-3 shrink-0 text-muted-foreground" />
                  <a
                    href={reference}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {reference}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

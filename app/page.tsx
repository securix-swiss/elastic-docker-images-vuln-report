import fs from "fs";
import path from "path";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Container, Layers, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ProductData } from "@/types";
import {
  SEVERITY_ORDER,
  SEVERITY_STYLES,
  Severity,
  normalizeSeverity,
} from "@/lib/severity";
import { capitalize, cn, formatDate } from "@/lib/utils";

interface ProductSummary {
  slug: string;
  name: string;
  cveCount: number;
  releaseCount: number;
  image: string;
  date: string;
  severityCounts: Record<Severity, number>;
}

function emptySeverityCounts(): Record<Severity, number> {
  return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
}

async function loadProducts(): Promise<ProductSummary[] | null> {
  const dataPath = path.join(process.cwd(), "data/results");
  try {
    const files = fs
      .readdirSync(dataPath)
      .filter((file) => file.endsWith(".json"))
      .sort();

    const products = files.map((file) => {
      const slug = file.replace(".json", "");
      const filePath = path.join(dataPath, file);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(fileContent) as ProductData;
      const severityCounts = emptySeverityCounts();
      Object.values(data.cveData).forEach((cve) => {
        severityCounts[normalizeSeverity(cve.Severity)] += 1;
      });
      return {
        slug,
        name: capitalize(data.name),
        cveCount: Object.keys(data.cveData).length,
        releaseCount: data.releases.length,
        image: data.dockerImage.split(":")[0],
        date: data.date,
        severityCounts,
      };
    });

    return products;
  } catch (error) {
    console.error(`Error loading products:`, error);
    return null;
  }
}

export default async function ProductPage() {
  const products = await loadProducts();
  const totals = emptySeverityCounts();
  products?.forEach((product) => {
    SEVERITY_ORDER.forEach((severity) => {
      totals[severity] += product.severityCounts[severity];
    });
  });
  const totalCves =
    products?.reduce((total, product) => total + product.cveCount, 0) ?? 0;
  const totalReleases =
    products?.reduce((total, product) => total + product.releaseCount, 0) ?? 0;
  const latestScan = products?.reduce(
    (latest, product) => (product.date > latest ? product.date : latest),
    ""
  );

  const stats = [
    {
      label: "Images tracked",
      value: products?.length ?? 0,
      icon: Container,
    },
    {
      label: "Releases scanned",
      value: totalReleases,
      icon: Layers,
    },
    {
      label: "Open CVEs",
      value: totalCves,
      icon: ShieldAlert,
    },
    {
      label: "Critical CVEs",
      value: totals.CRITICAL,
      icon: ShieldAlert,
      accent: totals.CRITICAL > 0,
    },
  ];

  return (
    <>
      <section className="mb-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Vulnerability report</Badge>
          {latestScan && (
            <span className="text-xs text-muted-foreground">
              Last scan: {formatDate(latestScan)} · updated every Wednesday and
              Sunday
            </span>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Elastic Docker Image CVE Overview
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
          Every official Elastic Docker image is scanned with{" "}
          <a
            href="https://trivy.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            Trivy
          </a>
          . For each CVE you can see exactly which image versions are affected
          and which ones are safe to run.
        </p>
      </section>

      <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-2 py-5">
            <CardContent className="flex items-center justify-between px-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-semibold tabular-nums",
                    stat.accent && "text-red-600 dark:text-red-400"
                  )}
                >
                  {stat.value}
                </p>
              </div>
              <stat.icon
                className={cn(
                  "size-5 text-muted-foreground/60",
                  stat.accent && "text-red-600/70 dark:text-red-400/70"
                )}
              />
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          Tracked images
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {products?.map((product) => (
            <Card
              key={product.slug}
              className="group border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <CardDescription className="break-all font-mono text-xs">
                      {product.image}
                    </CardDescription>
                  </div>
                  <Container className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-3">
                  {SEVERITY_ORDER.filter(
                    (severity) =>
                      severity !== "UNKNOWN" ||
                      product.severityCounts[severity] > 0
                  ).map((severity) => (
                    <span
                      key={severity}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
                        product.severityCounts[severity] > 0
                          ? SEVERITY_STYLES[severity].badge
                          : "border-border/60 text-muted-foreground/60"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          product.severityCounts[severity] > 0
                            ? SEVERITY_STYLES[severity].dot
                            : "bg-muted-foreground/30"
                        )}
                      />
                      {product.severityCounts[severity]}{" "}
                      {SEVERITY_STYLES[severity].label}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 pt-0">
                <Button variant="default" asChild>
                  <Link href={`/${product.slug}/cve`}>
                    View {product.cveCount} CVEs
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/${product.slug}/releases`}>
                    {product.releaseCount} releases
                  </Link>
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">
                  Scanned {formatDate(product.date)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

import fs from "fs";
import path from "path";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductData } from "@/types";
import VersionCveTable from "@/app/_components/versionCveTable";
import { Button } from "@/components/ui/button";
import { capitalize, formatDate } from "@/lib/utils";

async function loadProductData(product: string): Promise<ProductData | null> {
  const dataPath = path.join(process.cwd(), "data/results", `${product}.json`);
  try {
    const fileContent = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading file for product ${product}:`, error);
    return null;
  }
}

export async function generateStaticParams() {
  const dataPath = path.join(process.cwd(), "data/results");
  const productFiles = fs
    .readdirSync(dataPath)
    .filter((file) => file.endsWith(".json"));

  return productFiles.flatMap((file) => {
    const product = file.replace(".json", "");
    const data = JSON.parse(
      fs.readFileSync(path.join(dataPath, file), "utf8")
    ) as ProductData;

    // Every version known to the scan: releases plus any version referenced
    // by a CVE (affected or not), so all generated links resolve.
    const versions = new Set<string>(
      data.releases.map((release) => release.version)
    );
    Object.values(data.cveData).forEach((cve) => {
      cve.affected_versions.forEach((version) => versions.add(version));
      cve.not_affected_versions.forEach((version) => versions.add(version));
    });

    return Array.from(versions).map((version) => ({ product, version }));
  });
}

export default async function VersionPage({
  params,
}: {
  params: Promise<{ product: string; version: string }>;
}) {
  const { product, version } = await params;
  const productData = await loadProductData(product);

  if (!productData) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-lg font-medium">Product not found</p>
        <Button variant="outline" asChild>
          <Link href="/">Back to overview</Link>
        </Button>
      </div>
    );
  }

  const release = productData.releases.find(
    (item) => item.version === version
  );
  const imageBase = productData.dockerImage.split(":")[0];

  return (
    <>
      <div className="mb-6">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
        >
          <Link href="/" className="transition-colors hover:text-foreground">
            Overview
          </Link>
          <ChevronRight className="size-3.5" />
          <Link
            href={`/${product}/releases`}
            className="transition-colors hover:text-foreground"
          >
            {capitalize(productData.name)}
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">{version}</span>
        </nav>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {capitalize(productData.name)} {version}
            </h1>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              {imageBase}:{version}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {release
                ? `Released ${formatDate(release.published_at)} · `
                : ""}
              Last scanned {formatDate(productData.date)}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${product}/releases`}>All versions</Link>
          </Button>
        </div>
      </div>

      <VersionCveTable
        slug={product}
        version={version}
        productData={productData}
      />
    </>
  );
}

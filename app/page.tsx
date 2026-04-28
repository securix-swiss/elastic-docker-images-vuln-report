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
import { ArrowRight, Package, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ProductData } from "@/types";

interface ProductSummary {
  slug: string;
  name: string;
  cveCount: number;
  releaseCount: number;
  image: string;
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
      return {
        slug,
        name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
        cveCount: Object.keys(data.cveData).length,
        releaseCount: data.releases.length,
        image: data.dockerImage,
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
  const totalCves =
    products?.reduce((total, product) => total + product.cveCount, 0) ?? 0;
  const totalReleases =
    products?.reduce((total, product) => total + product.releaseCount, 0) ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mb-8 border-border/70">
        <CardHeader className="gap-4">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">
              Elastic security report
            </Badge>
            <CardTitle className="text-2xl sm:text-3xl">
              Docker Image CVE Overview
            </CardTitle>
          </div>
          <CardDescription>
            A comprehensive list of Elastic Docker images scanned with Trivy,
            categorized by vulnerabilities so you can quickly track affected and
            fixed versions.
          </CardDescription>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{products?.length ?? 0} products</Badge>
            <Badge variant="outline">{totalCves} CVEs</Badge>
            <Badge variant="outline">{totalReleases} releases</Badge>
          </div>
        </CardHeader>
      </Card>

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
                  <CardDescription className="break-all text-xs">
                    {product.image}
                  </CardDescription>
                </div>
                <Package className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="gap-1">
                  <ShieldAlert className="size-3.5" />
                  {product.cveCount} CVEs
                </Badge>
                <Badge variant="outline">{product.releaseCount} releases</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 pt-0">
              <Button variant="default" asChild>
                <Link href={`/${product.slug}/cve`}>
                  CVE report
                  <ArrowRight className="size-4" />
                </Link>
              </Button>

              <Button variant="outline" asChild>
                <Link href={`/${product.slug}/releases`}>Release list</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

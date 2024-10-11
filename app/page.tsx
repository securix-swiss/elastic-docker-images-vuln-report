import fs from "fs";
import path from "path";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function loadProducts(): Promise<string[] | null> {
  const dataPath = path.join(process.cwd(), "data/results");
  try {
    const files = fs.readdirSync(dataPath);
    const products = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
    return products;
  } catch (error) {
    console.error(`Error loading products:`, error);
    return null;
  }
}

export default async function ProductPage({ params: {} }) {
  const products = await loadProducts();
  return (
    <div className="max-w-6xl mx-auto p-8">
      <Card className="w-full mb-8">
        <CardHeader>
          <CardTitle>Docker Image CVE Overview</CardTitle>
          <CardDescription>
            A comprehensive list of Elastic Docker images scanned with Trivy,
            categorized by CVE vulnerabilities to easily track which images are
            affected, fixed, or not affected.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product) => (
          <Card
            key={product}
            className="w-full hover:shadow-lg transition-shadow duration-300"
          >
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{product}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/${product}`}>
                <Button className="mt-4" variant="default">
                  View CVE Report
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

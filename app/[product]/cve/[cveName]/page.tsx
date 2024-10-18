import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { CVE } from "@/types";
import path from "path";
import fs from "fs";

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

export default async function CVEPage({
  params: { product, cveName },
}: {
  params: { product: string; cveName: string };
}) {
  const cve = await loadCVEData(product, cveName);

  if (!cve) {
    return <div>CVE not found</div>;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "low":
        return "bg-yellow-500";
      case "medium":
        return "bg-orange-500";
      case "high":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            {product} - {cveName}
          </CardTitle>
          <Link href={`/${product}`} passHref>
            <Button variant="outline" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Overview
            </Button>
          </Link>
        </div>
        <CardDescription>Detailed information about this CVE</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Severity</h3>
            <Badge className={`${getSeverityColor(cve.Severity)}`}>
              {cve.Severity}
            </Badge>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Description</h3>
            <p>{cve.Description}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">CVSS Scores</h3>
            {cve.CVSS?.nvd && (
              <div>
                <strong>NVD:</strong>
                {cve.CVSS?.nvd?.V3Score ? ` V3: ${cve.CVSS.nvd?.V3Score}` : ""}
                {cve.CVSS?.nvd?.V2Score ? ` V2: ${cve.CVSS.nvd?.V2Score}` : ""}
              </div>
            )}
            {cve.CVSS?.redhat && (
              <div>
                <strong>RedHat:</strong>
                {cve.CVSS?.redhat?.V3Score
                  ? ` V3: ${cve.CVSS.redhat?.V3Score}`
                  : ""}
                {cve.CVSS?.redhat?.V2Score
                  ? ` V2: ${cve.CVSS.redhat?.V2Score}`
                  : ""}
              </div>
            )}
          </div>
          <div className="flex space-x-32">
            <div>
              <h3 className="text-lg font-semibold">Affected Versions</h3>
              <ul className="list-disc list-inside">
                {cve.affected_versions.map((version, index) => (
                  <li key={index}>{version}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Not Affected Versions</h3>
              <ul className="list-disc list-inside">
                {cve.not_affected_versions.map((version, index) => (
                  <li key={index}>{version}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

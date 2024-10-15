"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ProductData } from "@/types";
import Link from "next/link";

export default function CVETable({
  productData,
}: {
  productData: ProductData | null;
}) {
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>(
    {}
  );
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "low":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "medium":
        return "bg-orange-500 hover:bg-orange-600";
      case "high":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const toggleExpand = (cveId: string) => {
    setExpandedRows((prev) => ({ ...prev, [cveId]: !prev[cveId] }));
  };

  const filteredCVEs = selectedSeverity
    ? Object.entries(productData!.cveData).filter(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ([_, cve]) => cve.Severity === selectedSeverity
      )
    : Object.entries(productData!.cveData);

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>{productData?.name} CVE Information</CardTitle>
        <CardDescription>
          <p>
            A list of all currenlty known CVE for {productData?.name} found by{" "}
            <Link
              href="https://trivy.dev/"
              target="_blank"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              trivy
            </Link>
            .
          </p>
          <p>Docker image: {productData?.dockerImage}</p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select
            onValueChange={(value) =>
              setSelectedSeverity(value === "null" || !value ? null : value)
            }
          >
            <SelectTrigger className="w-[180px] ">
              <SelectValue placeholder="Filter by Severity" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem className="cursor-pointer" value="null">
                All Severities
              </SelectItem>{" "}
              <SelectItem className="cursor-pointer" value="LOW">
                Low
              </SelectItem>
              <SelectItem className="cursor-pointer" value="MEDIUM">
                Medium
              </SelectItem>
              <SelectItem className="cursor-pointer" value="HIGH">
                High
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CVE ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>CVSS Score</TableHead>
              <TableHead>Affected Versions</TableHead>
              <TableHead>Not Affected Versions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCVEs.map(([cveId, cve]) => (
              <TableRow key={cveId}>
                <TableCell className="align-top">
                  <Link href={`/${productData?.name}/${cveId}`} className="text-blue-500 hover:text-blue-600 underline">{cveId}</Link>
                </TableCell>
                <TableCell className="max-w-md align-top text-pretty">
                  {cve.Description}
                </TableCell>
                <TableCell className="align-top">
                  <Badge className={`${getSeverityColor(cve.Severity)}`}>
                    {cve.Severity}
                  </Badge>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <p>
                  NVD:{" "}
                  {cve.CVSS?.nvd ? (
                    <>
                      {cve.CVSS.nvd.V3Score || cve.CVSS.nvd.V2Score}
                    </>
                  ) : 'n/a'}
                  </p>
                  <p>
                  RedHat:{" "}
                  {cve.CVSS?.redhat ? (
                    <>
                      {cve.CVSS.redhat.V3Score || cve.CVSS.redhat.V2Score}
                    </>
                  ) : 'n/a'}
                  </p>
                </TableCell>
                <TableCell className="align-top">
                  <ul className="list-disc list-inside">
                    {cve.affected_versions
                      .slice(0, expandedRows[cveId] ? undefined : 5)
                      .map((version, index) => (
                        <li key={index}>{version}</li>
                      ))}
                  </ul>
                  {cve.affected_versions.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(cveId)}
                      className="mt-2"
                    >
                      {expandedRows[cveId] ? (
                        <>
                          Show Less <ChevronUp className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Show More <ChevronDown className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <ul className="list-disc list-inside">
                    {cve.not_affected_versions
                      .slice(0, expandedRows[cveId] ? undefined : 5)
                      .map((version, index) => (
                        <li key={index}>{version}</li>
                      ))}
                  </ul>
                  {cve.not_affected_versions.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(cveId)}
                      className="mt-2"
                    >
                      {expandedRows[cveId] ? (
                        <>
                          Show Less <ChevronUp className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Show More <ChevronDown className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

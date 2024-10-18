"use client";

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
import { ProductData } from "@/types";
import Link from "next/link";

export default function ReleaseTable({
  productData,
}: {
  productData: ProductData | null;
}) {

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>{productData?.name} Releases</CardTitle>
        <CardDescription>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Release date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productData?.releases.map((release) => (
              <TableRow key={release.version}>
                <TableCell className="align-top">
                  {release.version}
                </TableCell>
                <TableCell className="max-w-md align-top text-pretty">
                  {release.published_at}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

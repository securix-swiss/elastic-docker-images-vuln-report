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
import { Search, SearchX } from "lucide-react";
import { ProductData } from "@/types";
import ProductHeader from "./productHeader";
import { formatDate } from "@/lib/utils";

export default function ReleaseTable({
  slug,
  productData,
}: {
  slug: string;
  productData: ProductData | null;
}) {
  const [query, setQuery] = useState("");

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((release) => (
                  <TableRow key={release.version}>
                    <TableCell className="font-mono text-xs font-medium">
                      {release.version}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(release.published_at)}
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

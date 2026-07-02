import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn, capitalize, formatDate } from "@/lib/utils";

export default function ProductHeader({
  slug,
  name,
  dockerImage,
  date,
  active,
}: {
  slug: string;
  name: string;
  dockerImage?: string;
  date?: string;
  active: "cve" | "releases";
}) {
  const tabs = [
    { key: "cve", label: "CVE report", href: `/${slug}/cve` },
    { key: "releases", label: "Releases", href: `/${slug}/releases` },
  ] as const;

  return (
    <div className="mb-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link
          href="/"
          className="transition-colors hover:text-foreground"
        >
          Overview
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">{capitalize(name)}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {capitalize(name)}
          </h1>
          {dockerImage && (
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              {dockerImage.split(":")[0]}
            </p>
          )}
          {date && (
            <p className="mt-1 text-xs text-muted-foreground">
              Last scanned {formatDate(date)} · updated every Wednesday and
              Sunday
            </p>
          )}
        </div>

        <div className="inline-flex rounded-lg border bg-muted p-0.5">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active === tab.key ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active === tab.key
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/public/JsonLd";
import { siteUrl } from "@/lib/site";

/** Visual breadcrumbs plus the matching BreadcrumbList JSON-LD. The last crumb is the current page. */
export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  const base = siteUrl();
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, i) => (
            <li key={item.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {i === items.length - 1 ? (
                <span aria-current="page" className="text-text">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-primary hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            item: `${base}${item.href}`,
          })),
        }}
      />
    </>
  );
}

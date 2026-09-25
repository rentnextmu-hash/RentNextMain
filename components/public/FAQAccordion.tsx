import { ChevronDown } from "lucide-react";

/**
 * FAQ list on native <details>/<summary>: keyboard and screen-reader
 * accessible, works without JavaScript, and the answers stay in the HTML
 * for search engines. Pair with FAQPage JSON-LD via faqJsonLd().
 */
export function FAQAccordion({ items }: { items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
      {items.map((item) => (
        <details key={item.question} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-text marker:content-none [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

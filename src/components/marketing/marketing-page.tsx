import { LocaleLink } from "@/i18n/navigation";

export type MarketingPageAction = {
  label: string;
  href: string;
};

export type MarketingPageSection = {
  title: string;
  body?: string;
  items?: string[];
  action?: MarketingPageAction;
};

export type MarketingPageProps = {
  title: string;
  description?: string;
  sections: MarketingPageSection[];
  footerNote?: string;
};

const isExternalHref = (href: string) =>
  href.startsWith("http") || href.startsWith("mailto:");

export function MarketingPage({
  title,
  description,
  sections,
  footerNote,
}: MarketingPageProps) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="text-base text-muted-foreground sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                {section.title}
              </h2>
              {section.body ? (
                <p className="text-sm text-muted-foreground sm:text-base">
                  {section.body}
                </p>
              ) : null}
              {section.items?.length ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.action ? (
                isExternalHref(section.action.href) ? (
                  <a
                    href={section.action.href}
                    className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    {section.action.label}
                  </a>
                ) : (
                  <LocaleLink
                    href={section.action.href}
                    className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    {section.action.label}
                  </LocaleLink>
                )
              ) : null}
            </div>
          ))}
        </div>

        {footerNote ? (
          <p className="mt-10 text-xs text-muted-foreground">{footerNote}</p>
        ) : null}
      </div>
    </div>
  );
}

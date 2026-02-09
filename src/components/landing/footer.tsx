"use client";

import { Github, Twitter, Heart } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocaleLink } from "@/i18n/navigation";
import { footerNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function LandingFooter() {
  const t = useTranslations("Footer");
  const currentYear = new Date().getFullYear();

  const footerSections = footerNavigation.map((section) => ({
    title: t(section.id),
    links: section.items.map((item) => ({
      title: t(`links.${item.id}`),
      href: item.href,
    })),
  }));

  const socialLinks = [
    ...(siteConfig.links.github
      ? [{ name: "GitHub", href: siteConfig.links.github, icon: Github }]
      : []),
    ...(siteConfig.links.twitter
      ? [{ name: "Twitter", href: siteConfig.links.twitter, icon: Twitter }]
      : []),
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <LocaleLink
              href="/"
              className="flex items-center gap-2 text-xl font-semibold mb-4"
            >
              🎬 VideoFly
            </LocaleLink>
            <p className="text-sm text-muted-foreground mb-4">
              {t("tagline")}
            </p>
            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-9 flex items-center justify-center rounded-full border border-border hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.title}>
                    <LocaleLink
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.title}
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {t("copyright", { year: currentYear })}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {t("madeWith")}
            <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
            {t("madeBy")}
          </p>
        </div>
      </div>
    </footer>
  );
}

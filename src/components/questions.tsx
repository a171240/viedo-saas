"use client";

import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Questions() {
  const t = useTranslations("Questions");
  const items = [
    {
      value: "about",
      question: t("items.about.question"),
      answer: t("items.about.answer"),
    },
    {
      value: "nextjs",
      question: t("items.nextjs.question"),
      answer: t("items.nextjs.answer"),
    },
    {
      value: "starter",
      question: t("items.starter.question"),
      answer: t("items.starter.answer"),
    },
  ];

  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

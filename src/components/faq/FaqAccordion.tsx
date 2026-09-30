"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getHash, getServerHash, itemIdFromHash, replaceHash, subscribeToHash } from "./faq-hash";

export interface FaqItemView {
  /** Also the element id, so `#<id>` opens and scrolls to the question. */
  id: string;
  question: string;
  answer: ReactNode;
}

export interface FaqGroupView {
  id: string;
  /** Element id of the group's section, the target of the topic navigation. */
  anchorId: string;
  title: string;
  items: readonly FaqItemView[];
}

/**
 * The FAQ as one accordion, so the arrow keys move through every question and one answer is open
 * at a time. The open question is mirrored in the address bar and opened from it, which makes each
 * question linkable.
 */
export function FaqAccordion({ groups }: { groups: readonly FaqGroupView[] }) {
  const itemIds = new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);

  // When the fragment changes (first client render, a link to a question), open the question it
  // names. Any other fragment, such as a topic link, leaves the open question alone.
  const [seenHash, setSeenHash] = useState("");
  const [openId, setOpenId] = useState("");
  if (hash !== seenHash) {
    setSeenHash(hash);
    const target = itemIdFromHash(hash, itemIds);
    if (target) setOpenId(target);
  }

  function handleValueChange(next: string) {
    setOpenId(next);
    replaceHash(next);
  }

  return (
    <Accordion
      type="single"
      collapsible
      value={openId}
      onValueChange={handleValueChange}
      className="grid gap-12 md:gap-14"
    >
      {groups.map((group) => (
        <section key={group.id} id={group.anchorId} aria-labelledby={`${group.anchorId}-title`}>
          <h2 id={`${group.anchorId}-title`} className="mb-3 text-h3 text-navy-900">
            {group.title}
          </h2>
          <div>
            {group.items.map((item) => (
              <AccordionItem key={item.id} id={item.id} value={item.id}>
                <AccordionTrigger headingLevel={3}>{item.question}</AccordionTrigger>
                <AccordionContent>
                  <p className="max-w-[68ch]">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </div>
        </section>
      ))}
    </Accordion>
  );
}

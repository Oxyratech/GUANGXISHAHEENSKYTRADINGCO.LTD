import type { ReactNode } from "react";

/**
 * Chunk renderers for the rich-text tags shared by the company messages: `<n>` marks a Latin name
 * (isolated so Arabic text does not reorder it) and `<zh>` marks Chinese text.
 */
export const richTags = {
  n: (chunks: ReactNode) => (
    <bdi lang="en" dir="ltr">
      {chunks}
    </bdi>
  ),
  zh: (chunks: ReactNode) => <span lang="zh-CN">{chunks}</span>,
};

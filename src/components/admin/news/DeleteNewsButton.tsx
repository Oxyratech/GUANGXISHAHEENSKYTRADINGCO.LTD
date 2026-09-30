"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { deleteNewsArticle } from "@/server/admin/news/actions";

export function DeleteNewsButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      action={deleteNewsArticle}
      fields={{ id }}
      variant="outline"
      label="Delete"
      title="Delete this article?"
      description={`"${title}" will be permanently removed. This cannot be undone.`}
      confirmLabel="Delete article"
      onSuccess={() => router.push("/admin/news")}
    />
  );
}

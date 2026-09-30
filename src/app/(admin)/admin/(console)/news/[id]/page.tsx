import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { DefinitionList, type DefinitionItem } from "@/components/admin/DefinitionList";
import { CreateTranslationButton } from "@/components/admin/news/CreateTranslationButton";
import { DeleteNewsButton } from "@/components/admin/news/DeleteNewsButton";
import { NewsArticleForm } from "@/components/admin/news/NewsArticleForm";
import { NewsStatusActions } from "@/components/admin/news/NewsStatusActions";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import {
  getNewsArticleForEdit,
  getNewsFormOptions,
  getTranslationSiblings,
} from "@/server/admin/news/detail";
import type {
  NewsArticleForEdit,
  NewsFormOptions,
  TranslationSibling,
} from "@/server/admin/news/detail";
import type { DatabaseUnavailableCause } from "@/server/db/errors";

export const metadata: Metadata = { title: "Edit article" };

type PageData =
  | {
      kind: "ready";
      article: NewsArticleForEdit;
      options: NewsFormOptions;
      siblings: TranslationSibling[];
    }
  | { kind: "not_found" }
  | { kind: "unavailable"; cause: DatabaseUnavailableCause };

async function loadPageData(id: string): Promise<PageData> {
  try {
    const article = await getNewsArticleForEdit(id);
    if (!article) return { kind: "not_found" };
    const [options, siblings] = await Promise.all([
      getNewsFormOptions(),
      getTranslationSiblings(article.translationGroupId),
    ]);
    return { kind: "ready", article, options, siblings };
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return { kind: "unavailable", cause: outage.cause };
  }
}

export default async function NewsArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAdminPage("news:read", { next: `/admin/news/${id}` });
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:read" />;

  const data = await loadPageData(id);
  if (data.kind === "not_found") return <AdminNotFound />;
  if (data.kind === "unavailable") {
    return (
      <>
        <PageHeader title="Edit article" />
        <DatabaseUnavailablePanel cause={data.cause} titleAs="h2" />
      </>
    );
  }

  const { article, options, siblings } = data;
  const canWrite = hasAdminPermission(access.session, "news:write");
  const canPublish = hasAdminPermission(access.session, "news:publish");
  const canDelete = hasAdminPermission(access.session, "news:delete");

  const summary: DefinitionItem[] = [
    { label: "Status", value: <StatusBadge status={article.status} /> },
    { label: "Locale", value: article.locale.toUpperCase() },
    {
      label: "Also available in",
      value:
        siblings
          .filter((sibling) => sibling.id !== article.id)
          .map((sibling) => sibling.locale.toUpperCase())
          .join(", ") || null,
    },
  ];

  return (
    <>
      <PageHeader
        title={article.title}
        description={`/${article.locale}/news/${article.slug}`}
        breadcrumbs={[{ label: "News", href: "/admin/news" }, { label: article.title }]}
        actions={
          <>
            {canWrite ? (
              <CreateTranslationButton
                sourceId={article.id}
                existingLocales={siblings.map((sibling) => sibling.locale)}
              />
            ) : null}
            {canDelete ? <DeleteNewsButton id={article.id} title={article.title} /> : null}
          </>
        }
      />

      <div className="grid gap-6">
        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <DefinitionList items={summary} columns={3} />
        </section>

        {canPublish ? (
          <section className="rounded-lg border border-line bg-white p-5 shadow-card">
            <h2 className="mb-3 text-label text-ink">Quick status change</h2>
            <NewsStatusActions id={article.id} version={article.version} status={article.status} />
          </section>
        ) : null}

        {canWrite ? (
          <NewsArticleForm
            article={article}
            options={options}
            canPublish={canPublish}
            defaultAuthorName={access.session.user.name}
          />
        ) : (
          <DefinitionList
            columns={1}
            items={[
              { label: "Summary", value: article.summary, wide: true },
              {
                label: "Content",
                value: <pre className="whitespace-pre-wrap">{article.content}</pre>,
                wide: true,
              },
            ]}
          />
        )}
      </div>
    </>
  );
}

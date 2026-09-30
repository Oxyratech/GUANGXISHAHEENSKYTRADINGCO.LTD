import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { EmptyPanel } from "@/components/admin/EmptyPanel";
import { FilterBar } from "@/components/admin/FilterBar";
import { MediaDocumentsTable } from "@/components/admin/media/MediaDocumentsTable";
import { MediaGrid } from "@/components/admin/media/MediaGrid";
import { PrivateAttachmentsTable } from "@/components/admin/media/PrivateAttachmentsTable";
import { UploadPanel } from "@/components/admin/media/UploadPanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MEDIA_KINDS,
  MEDIA_VISIBILITIES,
  type MediaKind,
  type MediaVisibility,
} from "@/lib/domain/statuses";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { parsePageParams, type RawSearchParams } from "@/server/admin/pagination";
import {
  ADMIN_UPLOAD_POLICIES,
  ADMIN_UPLOAD_POLICY_KEYS,
  listMediaLibrary,
  listPrivateAttachments,
  uploadMediaAsset,
} from "@/server/admin/media";
import { describeUploadPolicy } from "@/server/storage";

export const metadata: Metadata = { title: "Media library" };

const MEDIA_PATH = "/admin/media";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The media library: a grid for images, a table for documents, and a read-only tab for buyers'
 * private inquiry attachments. Upload is its own panel, shown only to someone who holds media:upload.
 */
export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requireAdminPage("media:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="media:read" />;
  const { session } = access;

  const params = await searchParams;
  const page = parsePageParams(params);

  const kindRaw = firstValue(params.kind);
  const kind =
    kindRaw && (MEDIA_KINDS as readonly string[]).includes(kindRaw)
      ? (kindRaw as MediaKind)
      : undefined;
  const visibilityRaw = firstValue(params.visibility);
  const visibility =
    visibilityRaw && (MEDIA_VISIBILITIES as readonly string[]).includes(visibilityRaw)
      ? (visibilityRaw as MediaVisibility)
      : undefined;
  const search = firstValue(params.q)?.trim() || undefined;

  let library: Awaited<ReturnType<typeof listMediaLibrary>>;
  let privateAttachments: Awaited<ReturnType<typeof listPrivateAttachments>>;
  try {
    [library, privateAttachments] = await Promise.all([
      listMediaLibrary({ kind, visibility, search }, page),
      listPrivateAttachments({ search }, page),
    ]);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Media library" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const canUpload = hasAdminPermission(session, "media:upload");
  const policies = ADMIN_UPLOAD_POLICY_KEYS.map((key) => {
    const entry = ADMIN_UPLOAD_POLICIES[key];
    return { key, label: entry.label, ...describeUploadPolicy(entry.policy) };
  });

  const images = library.rows.filter((row) => row.kind === "IMAGE");
  const documents = library.rows.filter((row) => row.kind === "DOCUMENT");

  return (
    <>
      <PageHeader
        title="Media library"
        description="Images and documents used across the site: products, news and public downloads."
      />

      <div className="grid gap-6">
        {canUpload ? <UploadPanel action={uploadMediaAsset} policies={policies} /> : null}

        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="private">Private attachments</TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <div className="grid gap-4">
              <FilterBar
                pathname={MEDIA_PATH}
                searchParams={params}
                filterKeys={["kind", "visibility", "q"]}
                label="Filter media"
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="media-filter-kind">Kind</Label>
                  <Select id="media-filter-kind" name="kind" defaultValue={kind ?? ""}>
                    <option value="">All kinds</option>
                    <option value="IMAGE">Images</option>
                    <option value="DOCUMENT">Documents</option>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="media-filter-visibility">Visibility</Label>
                  <Select
                    id="media-filter-visibility"
                    name="visibility"
                    defaultValue={visibility ?? ""}
                  >
                    <option value="">All</option>
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </Select>
                </div>
                <div className="grid min-w-48 gap-1.5">
                  <Label htmlFor="media-filter-q">File name</Label>
                  <Input id="media-filter-q" name="q" type="search" defaultValue={search ?? ""} />
                </div>
              </FilterBar>

              {library.rows.length === 0 ? (
                <EmptyPanel
                  title="No media matches these filters."
                  description="Uploaded product images, news covers and public documents appear here."
                />
              ) : (
                <div className="grid gap-6">
                  {images.length > 0 ? <MediaGrid rows={images} /> : null}
                  {documents.length > 0 ? <MediaDocumentsTable rows={documents} /> : null}
                </div>
              )}

              <AdminPagination
                meta={library.meta}
                pathname={MEDIA_PATH}
                searchParams={params}
                itemLabel="assets"
              />
            </div>
          </TabsContent>

          <TabsContent value="private">
            <div className="grid gap-4">
              <p className="text-small text-ink-muted">
                Files buyers attached to their inquiries. These are never public; each one links to
                the inquiry that owns it and opens only for staff who can view it.
              </p>
              {privateAttachments.rows.length === 0 ? (
                <EmptyPanel
                  title="No private attachments yet."
                  description="Files buyers attach to an inquiry will appear here, linked to that inquiry."
                />
              ) : (
                <PrivateAttachmentsTable rows={privateAttachments.rows} />
              )}
              <AdminPagination
                meta={privateAttachments.meta}
                pathname={MEDIA_PATH}
                searchParams={params}
                itemLabel="attachments"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

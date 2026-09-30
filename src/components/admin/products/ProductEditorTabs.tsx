"use client";

import { ProductImagesManager } from "@/components/admin/products/ProductImagesManager";
import { ProductLocaleEditor } from "@/components/admin/products/ProductLocaleEditor";
import { ProductDocumentsManager } from "@/components/admin/products/ProductDocumentsManager";
import { ProductSpecificationsEditor } from "@/components/admin/products/ProductSpecificationsEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductEditDetail } from "@/server/admin/products/detail";
import type { UploadPolicySummary } from "@/server/storage";

/** The editor's four panels: per-locale content, specifications, images and documents. */
export function ProductEditorTabs({
  product,
  imagePolicy,
  documentPolicy,
}: {
  product: ProductEditDetail;
  /** Upload limits, computed on the server (see the page) so the client never imports @/server/storage. */
  imagePolicy: UploadPolicySummary;
  documentPolicy: UploadPolicySummary;
}) {
  return (
    <Tabs defaultValue="content">
      <TabsList aria-label="Product editor sections">
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="specifications">
          Specifications ({product.specifications.length})
        </TabsTrigger>
        <TabsTrigger value="images">Images ({product.images.length})</TabsTrigger>
        <TabsTrigger value="documents">Documents ({product.documents.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="content">
        <ProductLocaleEditor
          productId={product.id}
          version={product.version}
          translations={product.translations}
        />
      </TabsContent>
      <TabsContent value="specifications">
        <ProductSpecificationsEditor
          productId={product.id}
          specifications={product.specifications}
        />
      </TabsContent>
      <TabsContent value="images">
        <ProductImagesManager productId={product.id} images={product.images} policy={imagePolicy} />
      </TabsContent>
      <TabsContent value="documents">
        <ProductDocumentsManager
          productId={product.id}
          documents={product.documents}
          policy={documentPolicy}
        />
      </TabsContent>
    </Tabs>
  );
}

BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductImage_mediaAssetId_idx] ON [dbo].[ProductImage]([mediaAssetId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductDocument_mediaAssetId_idx] ON [dbo].[ProductDocument]([mediaAssetId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessInquiry_productId_idx] ON [dbo].[BusinessInquiry]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InquiryAttachment_mediaAssetId_idx] ON [dbo].[InquiryAttachment]([mediaAssetId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsArticle_coverMediaId_idx] ON [dbo].[NewsArticle]([coverMediaId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsArticle_categoryId_idx] ON [dbo].[NewsArticle]([categoryId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH


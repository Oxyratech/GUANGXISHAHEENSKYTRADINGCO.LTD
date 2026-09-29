BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [User_id_df] DEFAULT newsequentialid(),
    [email] NVARCHAR(254) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [failedLoginCount] INT NOT NULL CONSTRAINT [User_failedLoginCount_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [lastLoginAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Role_id_df] DEFAULT newsequentialid(),
    [key] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [isSystem] BIT NOT NULL CONSTRAINT [Role_isSystem_df] DEFAULT 0,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Role_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[Permission] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Permission_id_df] DEFAULT newsequentialid(),
    [key] NVARCHAR(80) NOT NULL,
    [description] NVARCHAR(300),
    CONSTRAINT [Permission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Permission_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[RolePermission] (
    [roleId] UNIQUEIDENTIFIER NOT NULL,
    [permissionId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [RolePermission_pkey] PRIMARY KEY CLUSTERED ([roleId],[permissionId])
);

-- CreateTable
CREATE TABLE [dbo].[UserRole] (
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [roleId] UNIQUEIDENTIFIER NOT NULL,
    [assignedAt] DATETIME2 NOT NULL CONSTRAINT [UserRole_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserRole_pkey] PRIMARY KEY CLUSTERED ([userId],[roleId])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Session_id_df] DEFAULT newsequentialid(),
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [tokenHash] CHAR(64) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lastUsedAt] DATETIME2 NOT NULL CONSTRAINT [Session_lastUsedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [ipHash] CHAR(64),
    [userAgent] NVARCHAR(255),
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[MediaAsset] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [MediaAsset_id_df] DEFAULT newsequentialid(),
    [kind] NVARCHAR(16) NOT NULL,
    [visibility] NVARCHAR(16) NOT NULL CONSTRAINT [MediaAsset_visibility_df] DEFAULT 'PUBLIC',
    [fileName] NVARCHAR(200) NOT NULL,
    [mimeType] NVARCHAR(100) NOT NULL,
    [sizeBytes] INT NOT NULL,
    [sha256] CHAR(64) NOT NULL,
    [width] INT,
    [height] INT,
    [uploadedById] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MediaAsset_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MediaAsset_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MediaBlob] (
    [mediaAssetId] UNIQUEIDENTIFIER NOT NULL,
    [data] VARBINARY(max) NOT NULL,
    CONSTRAINT [MediaBlob_pkey] PRIMARY KEY CLUSTERED ([mediaAssetId])
);

-- CreateTable
CREATE TABLE [dbo].[MediaAssetTranslation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [MediaAssetTranslation_id_df] DEFAULT newsequentialid(),
    [mediaAssetId] UNIQUEIDENTIFIER NOT NULL,
    [locale] NVARCHAR(8) NOT NULL,
    [altText] NVARCHAR(300),
    [caption] NVARCHAR(500),
    CONSTRAINT [MediaAssetTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MediaAssetTranslation_mediaAssetId_locale_key] UNIQUE NONCLUSTERED ([mediaAssetId],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[Product] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Product_id_df] DEFAULT newsequentialid(),
    [slug] NVARCHAR(120) NOT NULL,
    [categorySlug] NVARCHAR(64) NOT NULL,
    [status] NVARCHAR(16) NOT NULL CONSTRAINT [Product_status_df] DEFAULT 'DRAFT',
    [origin] NVARCHAR(120),
    [sortOrder] INT NOT NULL CONSTRAINT [Product_sortOrder_df] DEFAULT 0,
    [featured] BIT NOT NULL CONSTRAINT [Product_featured_df] DEFAULT 0,
    [publishedAt] DATETIME2,
    [createdById] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Product_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [version] INT NOT NULL CONSTRAINT [Product_version_df] DEFAULT 0,
    CONSTRAINT [Product_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Product_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[ProductTranslation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ProductTranslation_id_df] DEFAULT newsequentialid(),
    [productId] UNIQUEIDENTIFIER NOT NULL,
    [locale] NVARCHAR(8) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [shortDescription] NVARCHAR(500),
    [description] NVARCHAR(max),
    [applications] NVARCHAR(max),
    [packagingInfo] NVARCHAR(1000),
    CONSTRAINT [ProductTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductTranslation_productId_locale_key] UNIQUE NONCLUSTERED ([productId],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[ProductSpecification] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ProductSpecification_id_df] DEFAULT newsequentialid(),
    [productId] UNIQUEIDENTIFIER NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [ProductSpecification_sortOrder_df] DEFAULT 0,
    CONSTRAINT [ProductSpecification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProductSpecificationTranslation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ProductSpecificationTranslation_id_df] DEFAULT newsequentialid(),
    [specificationId] UNIQUEIDENTIFIER NOT NULL,
    [locale] NVARCHAR(8) NOT NULL,
    [label] NVARCHAR(200) NOT NULL,
    [value] NVARCHAR(500) NOT NULL,
    CONSTRAINT [ProductSpecificationTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductSpecificationTranslation_specificationId_locale_key] UNIQUE NONCLUSTERED ([specificationId],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[ProductImage] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ProductImage_id_df] DEFAULT newsequentialid(),
    [productId] UNIQUEIDENTIFIER NOT NULL,
    [mediaAssetId] UNIQUEIDENTIFIER NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [ProductImage_sortOrder_df] DEFAULT 0,
    [isPrimary] BIT NOT NULL CONSTRAINT [ProductImage_isPrimary_df] DEFAULT 0,
    CONSTRAINT [ProductImage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductImage_productId_mediaAssetId_key] UNIQUE NONCLUSTERED ([productId],[mediaAssetId])
);

-- CreateTable
CREATE TABLE [dbo].[ProductDocument] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ProductDocument_id_df] DEFAULT newsequentialid(),
    [productId] UNIQUEIDENTIFIER NOT NULL,
    [mediaAssetId] UNIQUEIDENTIFIER NOT NULL,
    [kind] NVARCHAR(30) NOT NULL CONSTRAINT [ProductDocument_kind_df] DEFAULT 'OTHER',
    [sortOrder] INT NOT NULL CONSTRAINT [ProductDocument_sortOrder_df] DEFAULT 0,
    CONSTRAINT [ProductDocument_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductDocument_productId_mediaAssetId_key] UNIQUE NONCLUSTERED ([productId],[mediaAssetId])
);

-- CreateTable
CREATE TABLE [dbo].[ProductDocumentTranslation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ProductDocumentTranslation_id_df] DEFAULT newsequentialid(),
    [documentId] UNIQUEIDENTIFIER NOT NULL,
    [locale] NVARCHAR(8) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    CONSTRAINT [ProductDocumentTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductDocumentTranslation_documentId_locale_key] UNIQUE NONCLUSTERED ([documentId],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[InquiryStatus] (
    [code] NVARCHAR(20) NOT NULL,
    [label] NVARCHAR(60) NOT NULL,
    [sortOrder] INT NOT NULL,
    [isTerminal] BIT NOT NULL CONSTRAINT [InquiryStatus_isTerminal_df] DEFAULT 0,
    CONSTRAINT [InquiryStatus_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[BusinessInquiry] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [BusinessInquiry_id_df] DEFAULT newsequentialid(),
    [referenceCode] NVARCHAR(24) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [BusinessInquiry_status_df] DEFAULT 'NEW',
    [name] NVARCHAR(120) NOT NULL,
    [company] NVARCHAR(200) NOT NULL,
    [country] NVARCHAR(100) NOT NULL,
    [email] NVARCHAR(254) NOT NULL,
    [phone] NVARCHAR(40),
    [whatsapp] NVARCHAR(40),
    [productName] NVARCHAR(200) NOT NULL,
    [categorySlug] NVARCHAR(64),
    [quantity] NVARCHAR(120),
    [specification] NVARCHAR(4000),
    [targetPrice] NVARCHAR(120),
    [destinationCountry] NVARCHAR(100),
    [requiredDeliveryDate] DATE,
    [additionalRequirements] NVARCHAR(4000),
    [productId] UNIQUEIDENTIFIER,
    [locale] NVARCHAR(8) NOT NULL,
    [consentAcceptedAt] DATETIME2 NOT NULL,
    [ipHash] CHAR(64),
    [userAgent] NVARCHAR(255),
    [assignedToId] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BusinessInquiry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [version] INT NOT NULL CONSTRAINT [BusinessInquiry_version_df] DEFAULT 0,
    CONSTRAINT [BusinessInquiry_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BusinessInquiry_referenceCode_key] UNIQUE NONCLUSTERED ([referenceCode])
);

-- CreateTable
CREATE TABLE [dbo].[InquiryAttachment] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [InquiryAttachment_id_df] DEFAULT newsequentialid(),
    [inquiryId] UNIQUEIDENTIFIER NOT NULL,
    [mediaAssetId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InquiryAttachment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InquiryAttachment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InquiryAttachment_inquiryId_mediaAssetId_key] UNIQUE NONCLUSTERED ([inquiryId],[mediaAssetId])
);

-- CreateTable
CREATE TABLE [dbo].[InquiryNote] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [InquiryNote_id_df] DEFAULT newsequentialid(),
    [inquiryId] UNIQUEIDENTIFIER NOT NULL,
    [authorId] UNIQUEIDENTIFIER,
    [body] NVARCHAR(4000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InquiryNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InquiryNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[InquiryStatusChange] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [InquiryStatusChange_id_df] DEFAULT newsequentialid(),
    [inquiryId] UNIQUEIDENTIFIER NOT NULL,
    [fromStatus] NVARCHAR(20),
    [toStatus] NVARCHAR(20) NOT NULL,
    [changedById] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InquiryStatusChange_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InquiryStatusChange_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ContactMessage] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ContactMessage_id_df] DEFAULT newsequentialid(),
    [referenceCode] NVARCHAR(24) NOT NULL,
    [status] NVARCHAR(16) NOT NULL CONSTRAINT [ContactMessage_status_df] DEFAULT 'NEW',
    [name] NVARCHAR(120) NOT NULL,
    [company] NVARCHAR(200),
    [email] NVARCHAR(254) NOT NULL,
    [phone] NVARCHAR(40),
    [country] NVARCHAR(100),
    [message] NVARCHAR(4000) NOT NULL,
    [locale] NVARCHAR(8) NOT NULL,
    [consentAcceptedAt] DATETIME2 NOT NULL,
    [ipHash] CHAR(64),
    [userAgent] NVARCHAR(255),
    [handledById] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ContactMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ContactMessage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ContactMessage_referenceCode_key] UNIQUE NONCLUSTERED ([referenceCode])
);

-- CreateTable
CREATE TABLE [dbo].[NewsCategory] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [NewsCategory_id_df] DEFAULT newsequentialid(),
    [slug] NVARCHAR(80) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [NewsCategory_sortOrder_df] DEFAULT 0,
    CONSTRAINT [NewsCategory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NewsCategory_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[NewsCategoryTranslation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [NewsCategoryTranslation_id_df] DEFAULT newsequentialid(),
    [categoryId] UNIQUEIDENTIFIER NOT NULL,
    [locale] NVARCHAR(8) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    CONSTRAINT [NewsCategoryTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NewsCategoryTranslation_categoryId_locale_key] UNIQUE NONCLUSTERED ([categoryId],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[NewsTag] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [NewsTag_id_df] DEFAULT newsequentialid(),
    [slug] NVARCHAR(80) NOT NULL,
    CONSTRAINT [NewsTag_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NewsTag_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[NewsTagTranslation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [NewsTagTranslation_id_df] DEFAULT newsequentialid(),
    [tagId] UNIQUEIDENTIFIER NOT NULL,
    [locale] NVARCHAR(8) NOT NULL,
    [name] NVARCHAR(80) NOT NULL,
    CONSTRAINT [NewsTagTranslation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NewsTagTranslation_tagId_locale_key] UNIQUE NONCLUSTERED ([tagId],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[NewsArticle] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [NewsArticle_id_df] DEFAULT newsequentialid(),
    [translationGroupId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [NewsArticle_translationGroupId_df] DEFAULT newid(),
    [locale] NVARCHAR(8) NOT NULL,
    [slug] NVARCHAR(160) NOT NULL,
    [title] NVARCHAR(250) NOT NULL,
    [summary] NVARCHAR(600) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [coverMediaId] UNIQUEIDENTIFIER,
    [authorId] UNIQUEIDENTIFIER,
    [authorName] NVARCHAR(120),
    [categoryId] UNIQUEIDENTIFIER,
    [status] NVARCHAR(16) NOT NULL CONSTRAINT [NewsArticle_status_df] DEFAULT 'DRAFT',
    [publishedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NewsArticle_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [version] INT NOT NULL CONSTRAINT [NewsArticle_version_df] DEFAULT 0,
    CONSTRAINT [NewsArticle_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NewsArticle_locale_slug_key] UNIQUE NONCLUSTERED ([locale],[slug])
);

-- CreateTable
CREATE TABLE [dbo].[NewsArticleTag] (
    [articleId] UNIQUEIDENTIFIER NOT NULL,
    [tagId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [NewsArticleTag_pkey] PRIMARY KEY CLUSTERED ([articleId],[tagId])
);

-- CreateTable
CREATE TABLE [dbo].[SeoMetadata] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [SeoMetadata_id_df] DEFAULT newsequentialid(),
    [scope] NVARCHAR(16) NOT NULL,
    [refKey] NVARCHAR(120) NOT NULL,
    [locale] NVARCHAR(8) NOT NULL,
    [title] NVARCHAR(120),
    [description] NVARCHAR(320),
    [ogMediaId] UNIQUEIDENTIFIER,
    [noIndex] BIT NOT NULL CONSTRAINT [SeoMetadata_noIndex_df] DEFAULT 0,
    [updatedById] UNIQUEIDENTIFIER,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SeoMetadata_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SeoMetadata_scope_refKey_locale_key] UNIQUE NONCLUSTERED ([scope],[refKey],[locale])
);

-- CreateTable
CREATE TABLE [dbo].[SiteSetting] (
    [key] NVARCHAR(100) NOT NULL,
    [value] NVARCHAR(max) NOT NULL,
    [isPublic] BIT NOT NULL CONSTRAINT [SiteSetting_isPublic_df] DEFAULT 0,
    [updatedById] UNIQUEIDENTIFIER,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SiteSetting_pkey] PRIMARY KEY CLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [actorId] UNIQUEIDENTIFIER,
    [actorEmail] NVARCHAR(254),
    [action] NVARCHAR(100) NOT NULL,
    [entityType] NVARCHAR(60) NOT NULL,
    [entityId] NVARCHAR(64),
    [summary] NVARCHAR(500),
    [metadata] NVARCHAR(max),
    [ipHash] CHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RateLimitCounter] (
    [key] NVARCHAR(200) NOT NULL,
    [count] INT NOT NULL,
    [resetAt] DATETIME2 NOT NULL,
    CONSTRAINT [RateLimitCounter_pkey] PRIMARY KEY CLUSTERED ([key])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserRole_roleId_idx] ON [dbo].[UserRole]([roleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_userId_idx] ON [dbo].[Session]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Session_expiresAt_idx] ON [dbo].[Session]([expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MediaAsset_kind_visibility_idx] ON [dbo].[MediaAsset]([kind], [visibility]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MediaAsset_sha256_idx] ON [dbo].[MediaAsset]([sha256]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_categorySlug_status_sortOrder_idx] ON [dbo].[Product]([categorySlug], [status], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_status_publishedAt_idx] ON [dbo].[Product]([status], [publishedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductSpecification_productId_sortOrder_idx] ON [dbo].[ProductSpecification]([productId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductImage_productId_sortOrder_idx] ON [dbo].[ProductImage]([productId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessInquiry_status_createdAt_idx] ON [dbo].[BusinessInquiry]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessInquiry_email_idx] ON [dbo].[BusinessInquiry]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessInquiry_ipHash_createdAt_idx] ON [dbo].[BusinessInquiry]([ipHash], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BusinessInquiry_assignedToId_idx] ON [dbo].[BusinessInquiry]([assignedToId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InquiryNote_inquiryId_createdAt_idx] ON [dbo].[InquiryNote]([inquiryId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InquiryStatusChange_inquiryId_createdAt_idx] ON [dbo].[InquiryStatusChange]([inquiryId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ContactMessage_status_createdAt_idx] ON [dbo].[ContactMessage]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ContactMessage_ipHash_createdAt_idx] ON [dbo].[ContactMessage]([ipHash], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsArticle_locale_status_publishedAt_idx] ON [dbo].[NewsArticle]([locale], [status], [publishedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsArticle_translationGroupId_idx] ON [dbo].[NewsArticle]([translationGroupId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NewsArticleTag_tagId_idx] ON [dbo].[NewsArticleTag]([tagId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_idx] ON [dbo].[AuditLog]([entityType], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_actorId_createdAt_idx] ON [dbo].[AuditLog]([actorId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RateLimitCounter_resetAt_idx] ON [dbo].[RateLimitCounter]([resetAt]);

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [dbo].[Permission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRole] ADD CONSTRAINT [UserRole_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MediaAsset] ADD CONSTRAINT [MediaAsset_uploadedById_fkey] FOREIGN KEY ([uploadedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MediaBlob] ADD CONSTRAINT [MediaBlob_mediaAssetId_fkey] FOREIGN KEY ([mediaAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[MediaAssetTranslation] ADD CONSTRAINT [MediaAssetTranslation_mediaAssetId_fkey] FOREIGN KEY ([mediaAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProductTranslation] ADD CONSTRAINT [ProductTranslation_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductSpecification] ADD CONSTRAINT [ProductSpecification_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductSpecificationTranslation] ADD CONSTRAINT [ProductSpecificationTranslation_specificationId_fkey] FOREIGN KEY ([specificationId]) REFERENCES [dbo].[ProductSpecification]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductImage] ADD CONSTRAINT [ProductImage_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductImage] ADD CONSTRAINT [ProductImage_mediaAssetId_fkey] FOREIGN KEY ([mediaAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProductDocument] ADD CONSTRAINT [ProductDocument_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductDocument] ADD CONSTRAINT [ProductDocument_mediaAssetId_fkey] FOREIGN KEY ([mediaAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProductDocumentTranslation] ADD CONSTRAINT [ProductDocumentTranslation_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[ProductDocument]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessInquiry] ADD CONSTRAINT [BusinessInquiry_status_fkey] FOREIGN KEY ([status]) REFERENCES [dbo].[InquiryStatus]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessInquiry] ADD CONSTRAINT [BusinessInquiry_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[BusinessInquiry] ADD CONSTRAINT [BusinessInquiry_assignedToId_fkey] FOREIGN KEY ([assignedToId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InquiryAttachment] ADD CONSTRAINT [InquiryAttachment_inquiryId_fkey] FOREIGN KEY ([inquiryId]) REFERENCES [dbo].[BusinessInquiry]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[InquiryAttachment] ADD CONSTRAINT [InquiryAttachment_mediaAssetId_fkey] FOREIGN KEY ([mediaAssetId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InquiryNote] ADD CONSTRAINT [InquiryNote_inquiryId_fkey] FOREIGN KEY ([inquiryId]) REFERENCES [dbo].[BusinessInquiry]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[InquiryNote] ADD CONSTRAINT [InquiryNote_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InquiryStatusChange] ADD CONSTRAINT [InquiryStatusChange_fromStatus_fkey] FOREIGN KEY ([fromStatus]) REFERENCES [dbo].[InquiryStatus]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InquiryStatusChange] ADD CONSTRAINT [InquiryStatusChange_toStatus_fkey] FOREIGN KEY ([toStatus]) REFERENCES [dbo].[InquiryStatus]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[InquiryStatusChange] ADD CONSTRAINT [InquiryStatusChange_inquiryId_fkey] FOREIGN KEY ([inquiryId]) REFERENCES [dbo].[BusinessInquiry]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[InquiryStatusChange] ADD CONSTRAINT [InquiryStatusChange_changedById_fkey] FOREIGN KEY ([changedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContactMessage] ADD CONSTRAINT [ContactMessage_handledById_fkey] FOREIGN KEY ([handledById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewsCategoryTranslation] ADD CONSTRAINT [NewsCategoryTranslation_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[NewsCategory]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NewsTagTranslation] ADD CONSTRAINT [NewsTagTranslation_tagId_fkey] FOREIGN KEY ([tagId]) REFERENCES [dbo].[NewsTag]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NewsArticle] ADD CONSTRAINT [NewsArticle_coverMediaId_fkey] FOREIGN KEY ([coverMediaId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewsArticle] ADD CONSTRAINT [NewsArticle_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewsArticle] ADD CONSTRAINT [NewsArticle_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[NewsCategory]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NewsArticleTag] ADD CONSTRAINT [NewsArticleTag_articleId_fkey] FOREIGN KEY ([articleId]) REFERENCES [dbo].[NewsArticle]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[NewsArticleTag] ADD CONSTRAINT [NewsArticleTag_tagId_fkey] FOREIGN KEY ([tagId]) REFERENCES [dbo].[NewsTag]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SeoMetadata] ADD CONSTRAINT [SeoMetadata_ogMediaId_fkey] FOREIGN KEY ([ogMediaId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- HAND-WRITTEN ADDITIONS
-- Everything above this line is the output of `prisma migrate diff --from-empty --to-schema`.
-- Everything below is maintained by hand (Prisma cannot express it) and runs inside the same
-- transaction, so the migration is all-or-nothing.
--
-- Sections (a) and (b) mirror src/lib/domain/statuses.ts. prisma/migrations.test.ts parses this file
-- and fails when the two drift apart.
-- ---------------------------------------------------------------------------------------------

-- (a) CHECK constraints for string-enum columns. SQL Server has no native enums, so the database
-- rejects unknown values even when a write bypasses the application's zod validation.
-- The binary collation makes the check case-sensitive: the default database collation is
-- case-insensitive, but application code compares these values with ===.
-- BusinessInquiry.status and InquiryStatusChange.fromStatus/toStatus are not listed here: they are
-- guarded by foreign keys to the InquiryStatus lookup table instead.

-- AddCheckConstraint
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_status_check] CHECK ([status] COLLATE Latin1_General_100_BIN2 IN (N'DRAFT', N'PUBLISHED', N'ARCHIVED'));

-- AddCheckConstraint
ALTER TABLE [dbo].[NewsArticle] ADD CONSTRAINT [NewsArticle_status_check] CHECK ([status] COLLATE Latin1_General_100_BIN2 IN (N'DRAFT', N'PUBLISHED', N'ARCHIVED'));

-- AddCheckConstraint
ALTER TABLE [dbo].[MediaAsset] ADD CONSTRAINT [MediaAsset_kind_check] CHECK ([kind] COLLATE Latin1_General_100_BIN2 IN (N'IMAGE', N'DOCUMENT'));

-- AddCheckConstraint
ALTER TABLE [dbo].[MediaAsset] ADD CONSTRAINT [MediaAsset_visibility_check] CHECK ([visibility] COLLATE Latin1_General_100_BIN2 IN (N'PUBLIC', N'PRIVATE'));

-- AddCheckConstraint
ALTER TABLE [dbo].[ProductDocument] ADD CONSTRAINT [ProductDocument_kind_check] CHECK ([kind] COLLATE Latin1_General_100_BIN2 IN (N'SPECIFICATION_SHEET', N'CATALOGUE', N'CERTIFICATE', N'OTHER'));

-- AddCheckConstraint
ALTER TABLE [dbo].[ContactMessage] ADD CONSTRAINT [ContactMessage_status_check] CHECK ([status] COLLATE Latin1_General_100_BIN2 IN (N'NEW', N'READ', N'REPLIED', N'ARCHIVED'));

-- AddCheckConstraint
ALTER TABLE [dbo].[SeoMetadata] ADD CONSTRAINT [SeoMetadata_scope_check] CHECK ([scope] COLLATE Latin1_General_100_BIN2 IN (N'PAGE', N'CATEGORY', N'PRODUCT', N'NEWS'));

-- (b) Reference data: the inquiry lifecycle. Must exist before any BusinessInquiry row can be
-- written (foreign key). `npm run db:seed` upserts the same rows, so label/order edits in code
-- reach existing databases without a new migration.

-- InsertReferenceData
INSERT INTO [dbo].[InquiryStatus] ([code], [label], [sortOrder], [isTerminal]) VALUES
    (N'NEW', N'New', 1, 0),
    (N'REVIEWING', N'Reviewing', 2, 0),
    (N'QUALIFIED', N'Qualified', 3, 0),
    (N'QUOTATION', N'Quotation', 4, 0),
    (N'NEGOTIATION', N'Negotiation', 5, 0),
    (N'CONFIRMED', N'Confirmed', 6, 0),
    (N'COMPLETED', N'Completed', 7, 1),
    (N'CANCELLED', N'Cancelled', 8, 1);

-- (c) Indexes Prisma cannot express: none. Every access path in use is covered by the indexes
-- generated above; see docs/DATABASE.md ("Indexes") for the rationale and the candidates that were
-- deliberately not added.

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

/*
 * Shared admin components. Server components and client components are exported side by side; each
 * client component keeps its own "use client" boundary, so importing from here does not turn a server
 * page into a client one. A client component should import the specific module instead of this barrel.
 */
export { AccessDenied } from "./AccessDenied";
export { ActionField } from "./ActionField";
export { ActionForm, useActionForm, type ActionFormProps } from "./ActionForm";
export { ActionSubmit } from "./ActionSubmit";
export { AdminButtonLink, AdminLink } from "./AdminLink";
export { AdminNotFound } from "./AdminNotFound";
export { AdminPagination } from "./AdminPagination";
export { AdminShell } from "./AdminShell";
export { ConfirmButton, type ConfirmButtonProps } from "./ConfirmButton";
export { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";
export { CopyValue } from "./CopyValue";
export { DatabaseUnavailablePanel } from "./DatabaseUnavailablePanel";
export { DefinitionList, type DefinitionItem } from "./DefinitionList";
export { EmptyPanel } from "./EmptyPanel";
export { FilterBar } from "./FilterBar";
export { LocalDateTime } from "./LocalDateTime";
export { PageHeader, type PageHeaderCrumb } from "./PageHeader";
export { RefreshButton } from "./RefreshButton";
export { RegistryNotice } from "./RegistryNotice";
export { StatCard } from "./StatCard";
export { StatusBadge } from "./StatusBadge";

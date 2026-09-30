import "server-only";
import { NEWS_IMAGE, PRODUCT_IMAGE, PUBLIC_DOCUMENT, type UploadPolicy } from "@/server/storage";

/*
 * The upload policies an admin may choose from. INQUIRY_ATTACHMENT is deliberately absent: those
 * assets are only ever created by the public inquiry form, never uploaded by staff.
 */
export const ADMIN_UPLOAD_POLICIES = {
  PRODUCT_IMAGE: { policy: PRODUCT_IMAGE, label: "Product image" },
  NEWS_IMAGE: { policy: NEWS_IMAGE, label: "News cover or inline image" },
  PUBLIC_DOCUMENT: { policy: PUBLIC_DOCUMENT, label: "Public document (PDF)" },
} as const satisfies Record<string, { policy: UploadPolicy; label: string }>;

export type AdminUploadPolicyKey = keyof typeof ADMIN_UPLOAD_POLICIES;

export const ADMIN_UPLOAD_POLICY_KEYS = Object.keys(
  ADMIN_UPLOAD_POLICIES,
) as AdminUploadPolicyKey[];

export function isAdminUploadPolicyKey(value: string): value is AdminUploadPolicyKey {
  return Object.prototype.hasOwnProperty.call(ADMIN_UPLOAD_POLICIES, value);
}

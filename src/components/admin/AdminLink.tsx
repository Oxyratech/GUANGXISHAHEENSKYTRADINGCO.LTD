/*
 * Links inside the admin use next/link (client-side navigation, no full reload). The UI kit's
 * SmartLink deliberately renders a plain <a> for /admin paths, because the public locale router must not
 * touch them, so admin screens use these two instead.
 */
import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonVariants, type ButtonStyleProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A text link: blue, underlined on hover. */
export function AdminLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "rounded-xs text-blue-700 underline-offset-4 hover:text-blue-800 hover:underline",
        className,
      )}
      {...props}
    />
  );
}

/** A link with button styling, for actions that navigate ("New product", "Back to list"). */
export function AdminButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={buttonVariants({ variant, size, className })} {...props} />;
}

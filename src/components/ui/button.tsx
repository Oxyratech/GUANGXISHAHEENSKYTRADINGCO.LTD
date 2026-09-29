/*
 * Button. Variants: primary (navy, default), secondary (blue), outline, ghost, gold (accent: use
 * sparingly, at most one per view), link, destructive. inverse and outline-inverse are for navy
 * bands (Section/PageHero tone="navy"), where primary would vanish.
 * Sizes: sm (40px, hit area padded to 44px), md (44px), lg (52px), icon (44px square; always give
 * it an aria-label).
 *
 *  - `asChild` renders the single child (e.g. <a>, <Link>) with the button styles and behaviour.
 *  - `loading` sets aria-busy + aria-disabled, shows a spinner and swallows clicks, but keeps focus
 *    (a `disabled` button drops out of the tab order mid-submit). With `asChild` no spinner is added.
 *  - Use buttonVariants() to style non-button elements; use <ButtonLink> for navigation.
 */
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonStyles = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-button",
    "transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50 data-loading:cursor-progress",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950",
        secondary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
        outline:
          "border border-line-strong bg-white text-navy-900 hover:border-navy-600 hover:bg-surface active:bg-surface-2",
        ghost: "text-navy-900 hover:bg-surface-2 active:bg-line",
        gold: "bg-gold-400 text-navy-950 hover:bg-gold-300 active:bg-gold-500",
        link: "rounded-xs text-blue-600 underline-offset-4 hover:text-blue-800 hover:underline",
        destructive: "bg-danger-600 text-white hover:bg-danger-600/90 active:bg-danger-600",
        inverse: "bg-white text-navy-900 hover:bg-blue-50 active:bg-blue-100",
        "outline-inverse": "border border-white/40 text-white hover:bg-white/10 active:bg-white/15",
      },
      size: {
        sm: "h-10 px-4 before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-[''] [&_svg]:size-4",
        md: "h-11 px-5 [&_svg]:size-[1.125rem]",
        lg: "h-13 px-8 [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
      },
    },
    compoundVariants: [
      // A link-styled button sizes to its text, like an inline link.
      { variant: "link", className: "h-auto min-h-0 px-0 before:hidden" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonStyleProps = VariantProps<typeof buttonStyles>;

/** Class names for a button look. Merged with tailwind-merge so `className` wins over variants. */
export function buttonVariants({
  className,
  ...props
}: ButtonStyleProps & { className?: string } = {}): string {
  return cn(buttonStyles(props), className);
}

export type ButtonProps = ComponentProps<"button"> &
  ButtonStyleProps & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  className,
  asChild = false,
  loading = false,
  disabled,
  type,
  onClick,
  children,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <Comp
      ref={ref}
      // A real button must not submit a surrounding form unless asked to.
      type={asChild ? type : (type ?? "button")}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      data-loading={loading || undefined}
      onClick={handleClick}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner className="size-4" /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}

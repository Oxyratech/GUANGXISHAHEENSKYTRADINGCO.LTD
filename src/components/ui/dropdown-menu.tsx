"use client";

/*
 * Radix dropdown menu: arrow-key navigation, typeahead, Esc, focus return. Items are 44px tall.
 * Use asChild on an item to make it a link (<DropdownMenuItem asChild><SmartLink …/></DropdownMenuItem>).
 * For "pick one" menus (language switcher) use DropdownMenuRadioGroup + DropdownMenuRadioItem.
 */
import { Check } from "lucide-react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useUiDirection } from "./direction";
import "./ui-motion.css";

export function DropdownMenu(props: ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root dir={useUiDirection()} {...props} />;
}

export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  align = "start",
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={12}
        className={cn(
          "ui-pop z-50 max-w-[calc(100vw-1.5rem)] min-w-48 rounded-lg border border-line bg-white p-1.5 shadow-raised",
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

const itemStyles =
  "relative flex min-h-11 w-full cursor-pointer select-none items-center gap-2.5 rounded-md px-3 text-small text-ink outline-none transition-colors data-[highlighted]:bg-surface data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return <MenuPrimitive.Item className={cn(itemStyles, className)} {...props} />;
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(itemStyles, "justify-between data-[state=checked]:font-medium", className)}
      {...props}
    >
      {children}
      <MenuPrimitive.ItemIndicator>
        <Check aria-hidden className="size-4 text-blue-600" />
      </MenuPrimitive.ItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={cn("px-3 py-2 text-eyebrow text-ink-subtle", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator className={cn("-mx-1.5 my-1.5 h-px bg-line", className)} {...props} />
  );
}

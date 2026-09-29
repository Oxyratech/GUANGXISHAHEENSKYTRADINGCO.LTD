import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware Link / redirect / usePathname / useRouter. Always use these instead of next/link. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

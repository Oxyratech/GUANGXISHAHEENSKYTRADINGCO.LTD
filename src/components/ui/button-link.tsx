import { buttonVariants, type ButtonStyleProps } from "./button";
import { SmartLink, type SmartLinkProps } from "./smart-link";

export type ButtonLinkProps = SmartLinkProps & ButtonStyleProps;

/**
 * A link that looks like a Button. Internal paths are locale-aware; external URLs get
 * rel="noopener noreferrer" (see SmartLink). Icons go inside as children; directional icons need
 * the `rtl-flip` class (or <DirectionalIcon>).
 */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <SmartLink className={buttonVariants({ variant, size, className })} {...props} />;
}

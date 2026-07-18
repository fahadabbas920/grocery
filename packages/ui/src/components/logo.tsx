import { cn } from "../lib/utils";

export type LogoVariant = "mark" | "horizontal" | "vertical";

/**
 * BasketBee brand mark. Each app must place the matching asset in its own
 * `public/brand/` folder (Next.js can't serve another app's `public/` dir):
 *   - mark.png        — square app-icon-style bee mark
 *   - horizontal.png  — bee + "Basket Bee" wordmark, side by side
 *   - vertical.png     — stacked logo + tagline
 */
const SRC: Record<LogoVariant, string> = {
  mark: "/brand/mark.png",
  horizontal: "/brand/horizontal.png",
  vertical: "/brand/vertical.png",
};

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
}

export function Logo({ variant = "horizontal", className }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SRC[variant]} alt="BasketBee" className={cn("object-contain", className)} />
  );
}

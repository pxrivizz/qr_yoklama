import Image from "next/image";

import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  alt?: string;
  variant?: "default" | "sidebar";
};

export function BrandMark({
  className,
  priority = false,
  alt = "",
  variant = "default",
}: BrandMarkProps) {
  return (
    <Image
      src={variant === "sidebar" ? "/assets/brand/dersdevam-mark-sidebar.png" : "/assets/brand/dersdevam-mark-neutral.png"}
      alt={alt}
      width={256}
      height={256}
      priority={priority}
      className={cn("shrink-0", className)}
    />
  );
}

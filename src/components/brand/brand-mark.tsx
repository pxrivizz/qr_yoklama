import Image from "next/image";

import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function BrandMark({ className, priority = false, alt = "" }: BrandMarkProps) {
  return (
    <Image
      src="/assets/brand/dersdevam-mark.png"
      alt={alt}
      width={256}
      height={256}
      priority={priority}
      className={cn("shrink-0 rounded-[22%]", className)}
    />
  );
}

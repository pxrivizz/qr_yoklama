import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

const widthClasses = {
  compact: "max-w-3xl",
  reading: "max-w-5xl",
  standard: "max-w-6xl",
  wide: "max-w-[1320px]",
} as const;

type PageContainerProps = ComponentPropsWithoutRef<"div"> & {
  width?: keyof typeof widthClasses;
};

export function PageContainer({
  width = "standard",
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "animate-fade-in-up mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        widthClasses[width],
        className,
      )}
      {...props}
    />
  );
}

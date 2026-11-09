import { cn } from "@/lib/cn";

type TableProps = {
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
};

export function Table({ className, children, ariaLabel = "Tablo" }: TableProps) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn("overflow-x-auto overscroll-x-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", className)}
    >
      <table className="w-full text-left">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-outline-variant bg-gradient-to-r from-surface-container-low to-surface-container-lowest">
        {children}
      </tr>
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th
      className={cn(
        "px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <td className={cn("px-6 py-3 font-body-md text-body-md", className)}>
      {children}
    </td>
  );
}

export function TableRow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <tr
      className={cn(
        "group border-b border-outline-variant last:border-b-0 transition-colors duration-150 hover:bg-surface-container-low",
        className,
      )}
    >
      {children}
    </tr>
  );
}

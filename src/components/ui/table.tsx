import { cn } from "@/lib/cn";

type TableProps = {
  className?: string;
  children: React.ReactNode;
};

export function Table({ className, children }: TableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
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
  onClick,
  children,
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "group border-b border-outline-variant last:border-b-0 transition-all duration-200 hover:bg-surface-container-low",
        className,
      )}
    >
      {children}
    </tr>
  );
}

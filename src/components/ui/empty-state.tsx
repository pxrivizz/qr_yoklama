import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
  children?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-fade-in-up rounded-xl border-2 border-dashed border-outline-variant/60 px-6 py-12 text-center",
        className,
      )}
    >
      <h2 className="font-h3 text-h3 text-on-surface">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm font-body-md text-body-md leading-6 text-on-surface-variant">
        {description}
      </p>
      {action &&
        (action.href ? (
          <ButtonLink href={action.href} variant="primary" size="md" className="mt-6">
            {action.label}
          </ButtonLink>
        ) : (
          <Button type="button" onClick={action.onClick} variant="primary" size="md" className="mt-6">
            {action.label}
          </Button>
        ))}
      {children}
    </div>
  );
}

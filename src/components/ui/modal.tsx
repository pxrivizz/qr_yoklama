"use client";

import { useEffect, useId, useRef, useState } from "react";

import { MaterialIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setClosing(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  function closeWithAnimation() {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(onClose, 160);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-visible bg-transparent p-0 text-on-surface backdrop:bg-primary/40 backdrop:backdrop-blur-sm",
        closing ? "modal-is-closing" : "modal-is-opening",
      )}
      onCancel={(event) => {
        event.preventDefault();
        closeWithAnimation();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeWithAnimation();
      }}
    >
      <div
        className={cn(
          "mx-auto max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_24px_80px_rgba(0,20,45,0.24)]",
          className,
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-outline-variant bg-surface-container-lowest px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="font-h3 text-h3 text-on-surface">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 font-body-md text-body-md text-on-surface-variant">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Pencereyi kapat"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            onClick={closeWithAnimation}
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </dialog>
  );
}

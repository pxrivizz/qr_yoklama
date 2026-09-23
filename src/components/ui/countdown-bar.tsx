"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type CountdownBarProps = {
  /** Toplam süre (saniye) */
  totalSeconds: number;
  /** Kalan süre (saniye) */
  remainingSeconds: number;
  className?: string;
};

export function CountdownBar({ totalSeconds, remainingSeconds, className }: CountdownBarProps) {
  const progress = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  return (
    <div className={cn("w-full", className)} role="progressbar" aria-valuenow={remainingSeconds} aria-valuemin={0} aria-valuemax={totalSeconds}>
      <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
        <span>Yeni kod</span>
        <span>{remainingSeconds} sn</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-outline-variant">
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-1000 ease-linear",
            remainingSeconds < 5 ? "progress-urgent" : "progress-gradient"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

type UseCountdownOptions = {
  totalSeconds: number;
  expiresAt: number;
  onExpire?: () => void;
};

export function useCountdown({ totalSeconds, expiresAt, onExpire }: UseCountdownOptions) {
  const [remaining, setRemaining] = useState(() =>
    expiresAt > 0 ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 0,
  );
  const onExpireCalledRef = useRef(false);

  useEffect(() => {
    onExpireCalledRef.current = false;
    if (expiresAt <= 0) {
      return;
    }

    const tick = () => {
      const next = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !onExpireCalledRef.current) {
        onExpireCalledRef.current = true;
        onExpire?.();
      }
    };

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  return { remainingSeconds: expiresAt > 0 ? remaining : 0, totalSeconds };
}

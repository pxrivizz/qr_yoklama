"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { geolocationErrorMessage } from "@/lib/browser/geolocation-error";

type StudentQrModalProps = {
  open: boolean;
  onClose: () => void;
  targetCourseId?: string;
  targetCourseName?: string;
  onSuccess?: (courseName: string) => void;
};

type ScanState = "ready" | "scanning" | "checking" | "success" | "error";

function tokenFromQrValue(rawValue: string) {
  const value = rawValue.trim();
  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return url.searchParams.get("token") ?? (value.split(".").length === 3 ? value : "");
  } catch {
    return value.split(".").length === 3 ? value : "";
  }
}

function getSinglePosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function currentPosition(): Promise<GeolocationPosition> {
  try {
    return await getSinglePosition({
      enableHighAccuracy: true,
      timeout: 8_000,
      maximumAge: 60_000,
    });
  } catch (firstError) {
    const code =
      typeof firstError === "object" && firstError !== null && "code" in firstError
        ? Number((firstError as { code: unknown }).code)
        : undefined;

    if (code === 1) throw firstError;

    return await getSinglePosition({
      enableHighAccuracy: false,
      timeout: 12_000,
      maximumAge: 300_000,
    });
  }
}

export function StudentQrModal({
  open,
  onClose,
  targetCourseId,
  targetCourseName,
  onSuccess,
}: StudentQrModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | undefined>(undefined);
  const handledTokenRef = useRef<string | null>(null);
  const isCancelledRef = useRef(false);

  const [state, setState] = useState<ScanState>("ready");
  const [statusTitle, setStatusTitle] = useState("Kamera Başlatılıyor");
  const [statusMessage, setStatusMessage] = useState(
    targetCourseName
      ? `${targetCourseName} dersi için öğretmen ekranındaki QR kodu kameraya gösterin.`
      : "Öğretmen ekranındaki QR kodunu kameraya gösterin.",
  );

  const stopCamera = useCallback(() => {
    isCancelledRef.current = true;
    if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const submitToken = useCallback(
    async (token: string) => {
      if (!token || handledTokenRef.current === token) return;
      handledTokenRef.current = token;
      stopCamera();
      setState("checking");
      setStatusTitle("QR Doğrulanıyor");
      setStatusMessage("Konum, ders eşleşmesi ve ağ güvenliği kontrol ediliyor...");

      try {
        // Inspect token with targetCourseId check
        const inspectUrl = targetCourseId
          ? `/api/attendance/scan?token=${encodeURIComponent(token)}&expectedCourseId=${encodeURIComponent(targetCourseId)}`
          : `/api/attendance/scan?token=${encodeURIComponent(token)}`;

        const inspectRes = await fetch(inspectUrl);
        const inspectJson = await inspectRes.json();
        if (!inspectRes.ok) {
          throw new Error(inspectJson.error?.message ?? "QR kodu doğrulanamadı.");
        }

        // Get location
        let pos: GeolocationPosition;
        try {
          pos = await currentPosition();
        } catch (geoErr) {
          throw new Error(geolocationErrorMessage(geoErr));
        }

        // Submit attendance scan
        const response = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            targetCourseId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
            scanSource: "Öğrenci Kamerası",
          }),
        });

        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error?.message ?? "Yoklama kaydedilemedi.");
        }

        const courseLabel = json.data?.courseName ?? targetCourseName ?? "Ders";
        setState("success");
        setStatusTitle("Yoklamanız başarıyla alındı");
        setStatusMessage(`${courseLabel} için katılımınız sisteme mühürlendi.`);

        if (onSuccess) {
          onSuccess(courseLabel);
        }
      } catch (err) {
        setState("error");
        setStatusTitle("Yoklama Alınamadı");
        setStatusMessage(err instanceof Error ? err.message : "QR kodu okunamadı.");
      }
    },
    [onSuccess, stopCamera, targetCourseId, targetCourseName],
  );

  const startCamera = useCallback(async () => {
    isCancelledRef.current = false;
    handledTokenRef.current = null;
    setState("scanning");
    setStatusTitle("QR Kodunu Okutun");
    setStatusMessage(
      targetCourseName
        ? `${targetCourseName} dersi QR kodunu yeşil çerçevenin ortasına hizalayın.`
        : "QR kodunu karenin ortasına hizalayın.",
    );

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setStatusTitle("Kamera Desteklenmiyor");
      setStatusMessage("Tarayıcınız kamera erişimini desteklemiyor veya güvenli bağlantı (HTTPS) gerekebilir.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      if (isCancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play().catch(() => {});

      const scanFrame = () => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) {
          scanTimerRef.current = window.setTimeout(scanFrame, 250);
          return;
        }

        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext("2d");
        if (!ctx) {
          scanTimerRef.current = window.setTimeout(scanFrame, 250);
          return;
        }

        ctx.drawImage(v, 0, 0, c.width, c.height);
        const imageData = ctx.getImageData(0, 0, c.width, c.height);
        const qr = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (qr?.data) {
          const token = tokenFromQrValue(qr.data);
          if (token) {
            void submitToken(token);
            return;
          }
        }

        scanTimerRef.current = window.setTimeout(scanFrame, 200);
      };

      scanFrame();
    } catch {
      setState("error");
      setStatusTitle("Kamera Açılamadı");
      setStatusMessage("Kamera izni verilmedi veya cihazınızda kamera bulunamadı.");
    }
  }, [submitToken, targetCourseName]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (open) {
        void startCamera();
      } else {
        stopCamera();
        setState("ready");
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  function handleClose() {
    stopCamera();
    onClose();
  }

  function handleRetry() {
    handledTokenRef.current = null;
    void startCamera();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        state === "success"
          ? "Yoklama Alındı"
          : state === "error"
            ? "Yoklama Hatası"
            : targetCourseName
              ? `QR Yoklama · ${targetCourseName}`
              : "Ders QR Kodu Oku"
      }
      description={statusMessage}
    >
      <div className="space-y-4">
        {/* Scanning Camera View */}
        {state === "scanning" && (
          <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-neutral-800 bg-black shadow-inner">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder Target Frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-56 sm:size-64 rounded-2xl border-2 border-emerald-400 bg-emerald-400/5 shadow-2xl">
                <span className="absolute -top-1 -left-1 size-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <span className="absolute -top-1 -right-1 size-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 size-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 size-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399] animate-pulse" />
              </div>
            </div>

            <div className="absolute bottom-3 inset-x-3 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                <MaterialIcon name="center_focus_strong" className="text-sm text-emerald-400" />
                Kodu karenin içine getirin
              </span>
            </div>
          </div>
        )}

        {/* Checking / Processing View */}
        {state === "checking" && (
          <div className="py-12 text-center space-y-3">
            <div className="grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-600 mx-auto animate-pulse">
              <MaterialIcon name="sync" className="text-3xl animate-spin" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">{statusTitle}</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">{statusMessage}</p>
          </div>
        )}

        {/* Success View */}
        {state === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 mx-auto shadow-md ring-8 ring-emerald-50">
              <MaterialIcon name="check_circle" className="text-4xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900">{statusTitle}</h3>
              <p className="mt-1 text-sm text-emerald-700 font-medium max-w-sm mx-auto">
                {statusMessage}
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleClose}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Tamamla ve Kapat
              </Button>
            </div>
          </div>
        )}

        {/* Error View */}
        {state === "error" && (
          <div className="py-8 text-center space-y-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-red-100 text-red-600 mx-auto shadow-md ring-8 ring-red-50">
              <MaterialIcon name="error" className="text-4xl" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-900">{statusTitle}</h3>
              <p className="mt-1 text-xs text-red-700 font-medium max-w-sm mx-auto">
                {statusMessage}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                className="flex-1 border border-neutral-200"
              >
                Kapat
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleRetry}
                className="flex-1 bg-neutral-900 text-white"
              >
                Tekrar Dene
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Actions when scanning */}
        {state === "scanning" && (
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClose}
              className="border border-neutral-200 text-xs px-4"
            >
              Vazgeç
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

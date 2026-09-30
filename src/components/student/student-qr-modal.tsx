"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { geolocationErrorMessage } from "@/lib/browser/geolocation-error";
import {
  decodeQrFromVideo,
  getCameraTorchCapability,
  getCameraZoomCapability,
  OPTIMAL_CAMERA_CONSTRAINTS,
  setCameraTorch,
  setCameraZoom,
  type ZoomCapability,
} from "@/lib/browser/qr-scanner-engine";

type StudentQrModalProps = {
  open: boolean;
  onClose: () => void;
  targetCourseId?: string;
  targetCourseName?: string;
  onSuccess?: (courseName: string) => void;
};

type ScanState = "ready" | "scanning" | "checking" | "success" | "error";

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
  const onSuccessRef = useRef(onSuccess);

  const [state, setState] = useState<ScanState>("ready");
  const [statusTitle, setStatusTitle] = useState("Kamera Başlatılıyor");
  const [statusMessage, setStatusMessage] = useState(
    targetCourseName
      ? `${targetCourseName} dersi için öğretmen ekranındaki QR kodu kameraya gösterin.`
      : "Öğretmen ekranındaki QR kodunu kameraya gösterin.",
  );

  const [zoomCap, setZoomCap] = useState<ZoomCapability>({ supported: false, min: 1, max: 1, step: 0.1, current: 1 });
  const [currentZoom, setCurrentZoom] = useState(1);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchActive, setTorchActive] = useState(false);

  const handleZoomChange = useCallback(async (level: number) => {
    if (!streamRef.current) return;
    const ok = await setCameraZoom(streamRef.current, level);
    if (ok) setCurrentZoom(level);
  }, []);

  const handleTorchToggle = useCallback(async () => {
    if (!streamRef.current) return;
    const next = !torchActive;
    const ok = await setCameraTorch(streamRef.current, next);
    if (ok) setTorchActive(next);
  }, [torchActive]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const stopCamera = useCallback(() => {
    isCancelledRef.current = true;
    if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setTorchActive(false);
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
        setStatusTitle(`${courseLabel} yoklamasına katılımınız başarıyla kaydedildi`);
        setStatusMessage("");

        onSuccessRef.current?.(courseLabel);
      } catch (err) {
        setState("error");
        setStatusTitle("Yoklama Alınamadı");
        setStatusMessage(err instanceof Error ? err.message : "QR kodu okunamadı.");
      }
    },
    [stopCamera, targetCourseId, targetCourseName],
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
      const stream = await navigator.mediaDevices.getUserMedia(OPTIMAL_CAMERA_CONSTRAINTS);

      if (isCancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const zCap = getCameraZoomCapability(stream);
      setZoomCap(zCap);
      setCurrentZoom(zCap.current);

      const tCap = getCameraTorchCapability(stream);
      setHasTorch(tCap.supported);
      setTorchActive(tCap.active);

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play().catch(() => { });

      const scanFrame = async () => {
        if (isCancelledRef.current || handledTokenRef.current) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c || v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          scanTimerRef.current = window.setTimeout(() => void scanFrame(), 100);
          return;
        }

        const token = await decodeQrFromVideo(v, c);
        if (token) {
          void submitToken(token);
          return;
        }

        scanTimerRef.current = window.setTimeout(() => void scanFrame(), 75);
      };

      void scanFrame();
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
          ? statusTitle
          : state === "error"
            ? "Yoklama Hatası"
            : targetCourseName
              ? `QR Yoklama · ${targetCourseName}`
              : "Ders QR Kodu Oku"
      }
      description={state === "success" ? undefined : statusMessage}
    >
      <div className="space-y-4">

        {state === "scanning" && (
          <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-neutral-800 bg-black shadow-inner">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {hasTorch && (
              <div className="absolute top-3 right-3 z-10">
                <button
                  type="button"
                  onClick={() => void handleTorchToggle()}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur shadow transition",
                    torchActive ? "bg-amber-400 text-neutral-900" : "bg-black/60 text-white/90 hover:bg-black/80"
                  )}
                >
                  <MaterialIcon name={torchActive ? "flashlight_on" : "flashlight_off"} className="text-sm" />
                  <span>{torchActive ? "Flaş Açık" : "Flaş"}</span>
                </button>
              </div>
            )}

            {/* Viewfinder Target Frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-52 sm:size-60 rounded-2xl border-2 border-emerald-400 bg-emerald-400/5 shadow-2xl">
                <span className="absolute -top-1 -left-1 size-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <span className="absolute -top-1 -right-1 size-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 size-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 size-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399] animate-pulse" />
              </div>
            </div>

            {/* Zoom Controls for distance scanning */}
            <div className="absolute bottom-3 inset-x-3 flex flex-col items-center gap-1.5 z-10">
              {zoomCap.supported && (
                <div className="flex items-center gap-1.5 rounded-full bg-black/60 p-1 backdrop-blur border border-white/10">
                  {[1, 2, 3].filter((lvl) => lvl <= zoomCap.max).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => void handleZoomChange(lvl)}
                      className={cn(
                        "size-8 rounded-full font-bold text-xs transition active:scale-95 flex items-center justify-center",
                        Math.abs(currentZoom - lvl) < 0.2
                          ? "bg-white text-neutral-900 shadow-sm ring-2 ring-emerald-400"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {lvl}x
                    </button>
                  ))}
                </div>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                <MaterialIcon name="center_focus_strong" className="text-sm text-emerald-400" />
                {zoomCap.supported ? "En arka için 2x/3x yakınlaştırın" : "Kodu karenin içine getirin"}
              </span>
            </div>
          </div>
        )}

        {state === "checking" && (
          <div className="py-12 text-center space-y-3">
            <div className="grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-600 mx-auto animate-pulse">
              <MaterialIcon name="sync" className="text-3xl animate-spin" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">{statusTitle}</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">{statusMessage}</p>
          </div>
        )}

        {state === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 mx-auto shadow-md ring-8 ring-emerald-50">
              <MaterialIcon name="check_circle" className="text-4xl" />
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
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold italic text-on-primary">
                i
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                <strong>Eğer konum hatası alırsanız (cihaz ile ilgili), tarayıcıyı değiştirin.</strong>
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

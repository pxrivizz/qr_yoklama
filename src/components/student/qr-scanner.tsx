"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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

    if (code === 1) {
      throw firstError;
    }

    try {
      return await getSinglePosition({
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 300_000,
      });
    } catch {
      throw firstError;
    }
  }
}

type PositionSnapshot = {
  position: GeolocationPosition;
  capturedAt: number;
};

export function QrScanner({ initialToken }: { initialToken?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | undefined>(undefined);
  const handledTokenRef = useRef<string | null>(null);
  const positionRef = useRef<PositionSnapshot | null>(null);
  const [state, setState] = useState<ScanState>("ready");
  const [courseName, setCourseName] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState(initialToken ? "Yoklamayı doğrula" : "QR kodunu okutun");
  const [message, setMessage] = useState(
    initialToken
      ? "Devam ettiğinizde telefonunuz konum erişimi isteyecek. Yoklamayı tamamlamak için izin verin."
      : "Kamera açılmadan önce telefonunuz konum erişimi isteyecek. Ardından öğretmen ekranındaki QR koduna doğrultun.",
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

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setTorchActive(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const submitToken = useCallback(
    async (token: string, suppliedPosition?: GeolocationPosition) => {
      if (!token || handledTokenRef.current === token) return;
      handledTokenRef.current = token;
      stopCamera();
      setState("checking");
      setTitle("QR doğrulanıyor");
      setMessage("Konum ve okul ağı kontrolleri yapılıyor.");

      try {
        const inspectResponse = await fetch(`/api/attendance/scan?token=${encodeURIComponent(token)}`);
        const inspectBody = (await inspectResponse.json()) as {
          data?: { courseName: string; courseCode: string };
          error?: { message?: string };
        };
        if (!inspectResponse.ok) throw new Error(inspectBody.error?.message ?? "QR kodu doğrulanamadı.");
        setCourseName(inspectBody.data ? `${inspectBody.data.courseCode} · ${inspectBody.data.courseName}` : undefined);

        let position = suppliedPosition;
        try {
          const cachedPosition = positionRef.current;
          if (!position && cachedPosition && Date.now() - cachedPosition.capturedAt < 60_000) {
            position = cachedPosition.position;
          }
          if (!position) position = await currentPosition();
        } catch (error) {
          throw new Error(geolocationErrorMessage(error));
        }

        const response = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          }),
        });
        const body = (await response.json()) as {
          data?: { courseName: string; courseCode: string };
          error?: { message?: string; code?: string };
        };
        if (!response.ok) throw new Error(body.error?.message ?? "Yoklama kaydedilemedi.");

        if (body.data) setCourseName(`${body.data.courseCode} · ${body.data.courseName}`);
        setState("success");
        setTitle("Yoklamanız alındı");
        setMessage("Derse katılımınız başarıyla kaydedildi. Bu ekranı kapatabilirsiniz.");
      } catch (caught) {
        setState("error");
        setTitle("Yoklama kaydedilemedi");
        setMessage(caught instanceof Error ? caught.message : "QR kodunu tekrar okutun.");
      }
    },
    [stopCamera],
  );

  const startCamera = useCallback(async () => {
    handledTokenRef.current = null;

    if (!window.isSecureContext) {
      setState("error");
      setTitle("Güvenli bağlantı gerekli");
      setMessage("Canlı kamera yalnızca HTTPS adresinde çalışır. Bu sayfayı uygulamanın https:// adresinden açın.");
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      setState("error");
      setTitle("Kamera desteklenmiyor");
      setMessage("Bu tarayıcı canlı kamera erişimini desteklemiyor. Güncel Chrome veya Safari ile tekrar deneyin.");
      return;
    }

    if (!navigator.geolocation) {
      setState("error");
      setTitle("Konum desteklenmiyor");
      setMessage("Bu tarayıcı konum erişimini desteklemiyor. Güncel Chrome veya Safari ile HTTPS adresinden tekrar deneyin.");
      return;
    }

    setState("checking");
    setTitle("Konum izni gerekli");
    setMessage("Telefonunuz konum erişimi sorarsa İzin Ver seçeneğine dokunun.");

    try {
      const position = await currentPosition();
      positionRef.current = { position, capturedAt: Date.now() };
    } catch (error) {
      setState("error");
      setTitle("Konum alınamadı");
      setMessage(geolocationErrorMessage(error));
      return;
    }

    setState("scanning");
    setTitle("Kamera izni gerekli");
    setMessage("Telefonunuz kamera erişimi sorarsa İzin Ver seçeneğine dokunun.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia(OPTIMAL_CAMERA_CONSTRAINTS);
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
      await video.play();
      setTitle("QR kodunu çerçeveye alın");
      setMessage("Kod algılandığında kontrol otomatik başlayacak.");

      const scan = async () => {
        if (!streamRef.current || handledTokenRef.current) return;
        const canvas = canvasRef.current;
        const v = videoRef.current;
        if (canvas && v && v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const token = await decodeQrFromVideo(v, canvas);
          if (token) {
            await submitToken(token);
            return;
          }
        }
        scanTimerRef.current = window.setTimeout(() => void scan(), 75);
      };
      void scan();
    } catch (caught) {
      stopCamera();
      setState("error");
      setTitle("Kamera açılamadı");
      setMessage(caught instanceof Error ? caught.message : "Tarayıcı ayarlarından kamera iznini açıp tekrar deneyin.");
    }
  }, [stopCamera, submitToken]);

  const verifyInitialToken = useCallback(async () => {
    if (!initialToken) return;
    handledTokenRef.current = null;

    if (!window.isSecureContext) {
      setState("error");
      setTitle("Güvenli bağlantı gerekli");
      setMessage("Konum izni yalnızca HTTPS adresinde çalışır. Bu sayfayı uygulamanın https:// adresinden açın.");
      return;
    }

    if (!navigator.geolocation) {
      setState("error");
      setTitle("Konum desteklenmiyor");
      setMessage("Bu tarayıcı konum erişimini desteklemiyor. Güncel Chrome veya Safari ile tekrar deneyin.");
      return;
    }

    setState("checking");
    setTitle("Konum izni gerekli");
    setMessage("Telefonunuz konum erişimi sorarsa İzin Ver seçeneğine dokunun.");

    try {
      const position = await currentPosition();
      positionRef.current = { position, capturedAt: Date.now() };
      await submitToken(initialToken, position);
    } catch (error) {
      setState("error");
      setTitle("Konum alınamadı");
      setMessage(geolocationErrorMessage(error));
    }
  }, [initialToken, submitToken]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-primary-container text-on-primary">
      <header className="relative z-10 flex items-center justify-between px-4 py-4">
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 font-label-sm text-label-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <MaterialIcon name="arrow_back" /> Çık
        </Link>
        <div className="flex items-center gap-3">
          {hasTorch && state === "scanning" && (
            <button
              type="button"
              onClick={() => void handleTorchToggle()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur transition shadow-sm",
                torchActive ? "bg-amber-400 text-neutral-900" : "bg-black/50 text-white/90 hover:bg-black/70"
              )}
            >
              <MaterialIcon name={torchActive ? "flashlight_on" : "flashlight_off"} className="text-sm" />
              <span>{torchActive ? "Flaş Açık" : "Flaş"}</span>
            </button>
          )}
          <p className="flex items-center gap-2 font-label-sm text-label-sm text-white/80"><MaterialIcon name="school" /> EduAttend</p>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden py-12">
        {state === "scanning" ? (
          <>
            <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" aria-label="QR kamera görüntüsü" />
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
            <div className="absolute inset-0 bg-primary/25" aria-hidden="true" />
            <div className="animate-viewfinder-pulse relative size-64 sm:size-72 rounded-2xl border-2 border-white/80 shadow-2xl" aria-hidden="true">
              <span className="absolute -left-0.5 -top-0.5 size-10 border-l-4 border-t-4 border-emerald-400 rounded-tl-lg" />
              <span className="absolute -right-0.5 -top-0.5 size-10 border-r-4 border-t-4 border-emerald-400 rounded-tr-lg" />
              <span className="absolute -bottom-0.5 -left-0.5 size-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <span className="absolute -bottom-0.5 -right-0.5 size-10 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
            </div>

            {/* Zoom Controls for distant/back-row scanning */}
            {zoomCap.supported && (
              <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-2 z-20">
                <div className="flex items-center gap-2 rounded-full bg-black/60 p-1.5 backdrop-blur-md border border-white/10">
                  {[1, 2, 3].filter((lvl) => lvl <= zoomCap.max).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => void handleZoomChange(lvl)}
                      className={cn(
                        "size-9 rounded-full font-bold text-xs shadow transition active:scale-95 flex items-center justify-center",
                        Math.abs(currentZoom - lvl) < 0.2
                          ? "bg-white text-neutral-900 shadow-md ring-2 ring-emerald-400"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {lvl}x
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-medium text-white/80 bg-black/50 px-2.5 py-0.5 rounded-full backdrop-blur">
                  En arka sıralar için 2x veya 3x yakınlaştırın
                </span>
              </div>
            )}
          </>
        ) : (
          <div
            className={cn(
              "animate-scale-pop grid size-32 place-items-center rounded-full border-2 text-center",
              state === "success" ? "border-secondary bg-secondary" : state === "error" ? "border-error bg-error" : "border-white/30",
            )}
            aria-hidden="true"
          >
            <span className="font-h1 text-h1">{state === "success" ? "✓" : state === "error" ? "!" : "QR"}</span>
          </div>
        )}
      </div>

      <section
        className={cn(
          "relative z-10 rounded-t-3xl px-6 pb-8 pt-6 text-center text-on-surface transition-all duration-500 ease-in-out",
          state === "success" ? "bg-secondary-container" : state === "error" ? "bg-error-container" : "bg-surface-container-lowest",
        )}
        aria-live="polite"
      >
        {courseName && <p className="font-label-sm text-label-sm text-secondary">{courseName}</p>}
        <h1 className="mt-1 font-h2 text-h2 text-on-surface">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm font-body-lg text-body-lg text-on-surface-variant">{message}</p>

        {(state === "ready" || state === "error") && (
          <div className="flex flex-col items-center">
            <Button
              type="button"
              size="lg"
              className="btn-lift press-scale mt-6 w-full max-w-sm"
              onClick={() => void (initialToken ? verifyInitialToken() : startCamera())}
            >
              {state === "error"
                ? "Tekrar Dene"
                : initialToken
                  ? "Konum İzni Ver ve Doğrula"
                  : "Konum İzni Ver ve Kamerayı Aç"}
            </Button>
            {state === "error" && (
              <div className="mt-4 w-full max-w-sm rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3.5 text-left text-xs text-on-surface-variant">
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <MaterialIcon name="info" className="text-sm text-primary" />
                  İzin veya Bağlantı Sorunu mu Yaşıyorsunuz?
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Safari (iOS):</strong> Adres çubuğundaki <em>aA</em> veya kilit simgesine dokunun &gt; <em>Web Sitesi Ayarları</em> &gt; Kamera ve Konum&apos;a <strong>İzin Ver</strong> seçin.</li>
                  <li><strong>Chrome (Android):</strong> Kilit simgesine dokunun &gt; <em>İzinler</em> &gt; Kamera ve Konum izinlerini açın.</li>
                  <li>Sayfayı yenileyip tekrar deneyin.</li>
                </ul>
              </div>
            )}
          </div>
        )}
        {state === "checking" && (
          <div className="mx-auto mt-6 h-1 w-full max-w-sm overflow-hidden rounded-full bg-outline-variant">
            <div className="h-full w-1/2 animate-pulse bg-secondary" />
          </div>
        )}
        {state === "success" && <p className="mt-6 font-label-sm text-label-sm text-on-secondary-container">İşlem tamamlandı</p>}
      </section>
    </main>
  );
}

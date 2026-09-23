"use client";

import Link from "next/link";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { geolocationErrorMessage } from "@/lib/browser/geolocation-error";

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

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setTitle("QR kodunu çerçeveye alın");
      setMessage("Kod algılandığında kontrol otomatik başlayacak.");

      const scan = async () => {
        if (!streamRef.current || handledTokenRef.current) return;
        const canvas = canvasRef.current;
        if (canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const maxWidth = 960;
          const scale = Math.min(1, maxWidth / video.videoWidth);
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(frame.data, frame.width, frame.height, {
              inversionAttempts: "attemptBoth",
            });
            const token = result ? tokenFromQrValue(result.data) : "";
            if (token) {
              await submitToken(token);
              return;
            }
          }
        }
        scanTimerRef.current = window.setTimeout(() => void scan(), 180);
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
        <p className="flex items-center gap-2 font-label-sm text-label-sm text-white/80"><MaterialIcon name="school" /> EduAttend</p>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden py-12">
        {state === "scanning" ? (
          <>
            <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" aria-label="QR kamera görüntüsü" />
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
            <div className="absolute inset-0 bg-primary/25" aria-hidden="true" />
            <div className="animate-viewfinder-pulse relative size-64 rounded-xl border-2 border-white/80" aria-hidden="true">
              <span className="absolute -left-0.5 -top-0.5 size-10 border-l-4 border-t-4 border-white" />
              <span className="absolute -right-0.5 -top-0.5 size-10 border-r-4 border-t-4 border-white" />
              <span className="absolute -bottom-0.5 -left-0.5 size-10 border-b-4 border-l-4 border-white" />
              <span className="absolute -bottom-0.5 -right-0.5 size-10 border-b-4 border-r-4 border-white" />
            </div>
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

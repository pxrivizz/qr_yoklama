import jsQR from "jsqr";
import {
  BinaryBitmap,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  QRCodeReader,
} from "@zxing/library";

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): {
        detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
      };
      getSupportedFormats?(): Promise<string[]>;
    };
  }
}

// Singleton instances to avoid re-allocating on every frame
let nativeDetector: { detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>> } | null = null;
let nativeDetectorChecked = false;
let zxingReader: QRCodeReader | null = null;
let zxingHints: Map<DecodeHintType, unknown> | null = null;

function getNativeDetector() {
  if (nativeDetectorChecked) return nativeDetector;
  nativeDetectorChecked = true;
  if (typeof window !== "undefined" && typeof window.BarcodeDetector === "function") {
    try {
      nativeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch {
      nativeDetector = null;
    }
  }
  return nativeDetector;
}

function getZxingReader() {
  if (!zxingReader) {
    zxingReader = new QRCodeReader();
    zxingHints = new Map();
    zxingHints.set(DecodeHintType.TRY_HARDER, true);
  }
  return { reader: zxingReader, hints: zxingHints! };
}

export type AttendanceQrPayload = {
  token: string;
  courseId?: string;
};

export function extractAttendanceQrFromRaw(rawValue: string): AttendanceQrPayload | null {
  const value = rawValue.trim();
  if (!value) return null;
  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const paramToken = url.searchParams.get("token");
    if (paramToken) {
      const courseId = url.searchParams.get("courseId")?.trim();
      return courseId ? { token: paramToken, courseId } : { token: paramToken };
    }
  } catch {
    // Not a valid URL, check direct token
  }
  // If it's a JWT-like string with 3 parts
  if (value.split(".").length === 3) {
    return { token: value };
  }
  return null;
}

export function extractTokenFromQrRaw(rawValue: string): string {
  return extractAttendanceQrFromRaw(rawValue)?.token ?? "";
}

/**
 * High-performance multi-tier QR decoder:
 * Tier 1: Hardware-accelerated native BarcodeDetector API (iOS 17+ Safari, Android Chrome)
 * Tier 2: ZXing with HybridBinarizer & TRY_HARDER (perspective deskewing for steep angles)
 * Tier 3: jsQR with 1:1 unscaled center crop & attemptBoth inversion
 */
export async function decodeAttendanceQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<AttendanceQrPayload | null> {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return null;
  }

  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;
  if (!vWidth || !vHeight) return null;

  // ── Tier 1: Native BarcodeDetector (GPU/Vision framework) ──
  const detector = getNativeDetector();
  if (detector) {
    try {
      const detected = await detector.detect(video);
      if (detected && detected.length > 0 && detected[0].rawValue) {
        const payload = extractAttendanceQrFromRaw(detected[0].rawValue);
        if (payload) return payload;
      }
    } catch {
      // Fallback to Tier 2 on detector failure
    }
  }

  // Draw video frame to canvas for CPU decoders
  canvas.width = vWidth;
  canvas.height = vHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, vWidth, vHeight);

  // ── Tier 2: ZXing QRCodeReader with HybridBinarizer (handles steep angles & projector glare) ──
  try {
    const { reader, hints } = getZxingReader();
    const source = new HTMLCanvasElementLuminanceSource(canvas);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const result = reader.decode(bitmap, hints);
    if (result && result.getText()) {
      const payload = extractAttendanceQrFromRaw(result.getText());
      if (payload) return payload;
    }
  } catch {
    // NotFoundException is expected when no QR is in view
  }

  // ── Tier 3A: jsQR on full frame (attemptBoth) ──
  const fullImageData = ctx.getImageData(0, 0, vWidth, vHeight);
  const jsqrFull = jsQR(fullImageData.data, fullImageData.width, fullImageData.height, {
    inversionAttempts: "attemptBoth",
  });
  if (jsqrFull?.data) {
    const payload = extractAttendanceQrFromRaw(jsqrFull.data);
    if (payload) return payload;
  }

  // ── Tier 3B: jsQR on Center Region of Interest (ROI) at 1:1 native sensor resolution ──
  // When far away, the center 50% retains micro-details without downsampling blur
  const cropSize = Math.round(Math.min(vWidth, vHeight) * 0.55);
  const startX = Math.round((vWidth - cropSize) / 2);
  const startY = Math.round((vHeight - cropSize) / 2);

  if (cropSize > 50 && startX >= 0 && startY >= 0) {
    const roiImageData = ctx.getImageData(startX, startY, cropSize, cropSize);
    const jsqrRoi = jsQR(roiImageData.data, roiImageData.width, roiImageData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (jsqrRoi?.data) {
      const payload = extractAttendanceQrFromRaw(jsqrRoi.data);
      if (payload) return payload;
    }
  }

  return null;
}

export async function decodeQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  return (await decodeAttendanceQrFromVideo(video, canvas))?.token ?? null;
}

export const OPTIMAL_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
  },
  audio: false,
};

export type ZoomCapability = {
  supported: boolean;
  min: number;
  max: number;
  step: number;
  current: number;
};

export function getCameraZoomCapability(stream: MediaStream | null): ZoomCapability {
  if (!stream) {
    return { supported: false, min: 1, max: 1, step: 0.1, current: 1 };
  }
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== "function") {
    return { supported: false, min: 1, max: 1, step: 0.1, current: 1 };
  }

  try {
    const caps = track.getCapabilities() as MediaTrackCapabilities & {
      zoom?: { min: number; max: number; step: number };
    };
    const settings = track.getSettings() as MediaTrackSettings & { zoom?: number };

    if (caps.zoom && typeof caps.zoom.max === "number" && caps.zoom.max > 1) {
      return {
        supported: true,
        min: caps.zoom.min || 1,
        max: caps.zoom.max,
        step: caps.zoom.step || 0.1,
        current: settings.zoom || 1,
      };
    }
  } catch {
    // Ignore unsupported errors
  }

  return { supported: false, min: 1, max: 1, step: 0.1, current: 1 };
}

export async function setCameraZoom(stream: MediaStream | null, targetZoom: number): Promise<boolean> {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.applyConstraints !== "function") return false;

  try {
    await track.applyConstraints({
      advanced: [{ zoom: targetZoom }] as unknown as MediaTrackConstraintSet[],
    });
    return true;
  } catch {
    return false;
  }
}

export type TorchCapability = {
  supported: boolean;
  active: boolean;
};

export function getCameraTorchCapability(stream: MediaStream | null): TorchCapability {
  if (!stream) return { supported: false, active: false };
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== "function") return { supported: false, active: false };

  try {
    const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    const settings = track.getSettings() as MediaTrackSettings & { torch?: boolean };
    return {
      supported: Boolean(caps.torch),
      active: Boolean(settings.torch),
    };
  } catch {
    return { supported: false, active: false };
  }
}

export async function setCameraTorch(stream: MediaStream | null, enabled: boolean): Promise<boolean> {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.applyConstraints !== "function") return false;

  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled }] as unknown as MediaTrackConstraintSet[],
    });
    return true;
  } catch {
    return false;
  }
}

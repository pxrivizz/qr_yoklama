"use client";

import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { ChangeEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";

type StudentPhotoUploadProps = {
  currentImage?: string | null;
};

export function StudentPhotoUpload({ currentImage }: StudentPhotoUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    variant: "success" | "error" | "warning";
  }>();

  const activePhoto = preview ?? currentImage ?? null;

  function resizeImageToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Görsel işlenemedi."));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => reject(new Error("Resim yüklenemedi."));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Dosya okunamadı."));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage(undefined);

    if (!file.type.startsWith("image/")) {
      setMessage({
        text: "Lütfen geçerli bir resim dosyası seçin (JPEG, PNG veya WebP).",
        variant: "error",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        text: "Fotoğraf boyutu 5 MB'dan küçük olmalıdır.",
        variant: "error",
      });
      return;
    }

    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setPreview(dataUrl);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Görsel işlenirken hata oluştu.",
        variant: "error",
      });
    }
  }

  async function handleSave() {
    if (!preview) return;

    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });

      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Fotoğraf kaydedilemedi.");
      }

      setMessage({
        text: "Profil fotoğrafınız başarıyla güncellendi.",
        variant: "success",
      });
      setPreview(null);
      router.refresh();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Fotoğraf kaydedilemedi.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    setPreview(null);
    setMessage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-outline-variant bg-surface-container shadow-sm sm:h-24 sm:w-24">
          {activePhoto ? (
            <NextImage
              src={activePhoto}
              alt="Profil fotoğrafı"
              width={96}
              height={96}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <MaterialIcon name="person" className="text-4xl sm:text-5xl" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-title-md text-title-md text-on-surface">
              Profil Fotoğrafı
            </h3>
            {currentImage ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-0.5 font-label-sm text-label-sm text-secondary">
                <MaterialIcon name="check_circle" className="text-sm" /> Kayıtlı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-error-container">
                <MaterialIcon name="error" className="text-sm" /> Zorunlu
              </span>
            )}
          </div>

          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {currentImage
              ? "Yoklama sırasında kimliğinizin doğrulanabilmesi için fotoğrafınız güncel olmalıdır."
              : "Yoklama alabilmeniz için yüzünüzün açıkça göründüğü bir profil fotoğrafı yüklemeniz zorunludur."}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {preview ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={handleSave}
                  className="gap-1.5"
                >
                  <MaterialIcon name="save" className="text-base" />
                  {pending ? "Kaydediliyor…" : "Fotoğrafı Kaydet"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={handleCancel}
                >
                  Vazgeç
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant={currentImage ? "secondary" : "primary"}
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <MaterialIcon
                  name={currentImage ? "photo_camera" : "add_a_photo"}
                  className="text-base"
                />
                {currentImage ? "Fotoğrafı Değiştir" : "Fotoğraf Ekle (Zorunlu)"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {message && (
        <StatusMessage variant={message.variant}>{message.text}</StatusMessage>
      )}
    </div>
  );
}

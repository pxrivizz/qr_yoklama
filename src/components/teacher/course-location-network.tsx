"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/status-message";
import { geolocationErrorMessage } from "@/lib/browser/geolocation-error";
import {
  CAMPUS_LOCATION_PRESETS,
  DEFAULT_CAMPUS_NETWORK_CIDR,
  findCampusLocationPreset,
  googleMapsLocationUrl,
} from "@/lib/locations/campus-locations";
import { toCourseNetworkCidr } from "@/lib/network/ip-address";

type CourseLocationNetworkProps = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onLocationChange: (latitude: number, longitude: number) => void;
  onIpAddressChange: (cidr: string) => void;
};

type UpdateStatus = {
  variant: "success" | "warning" | "error";
  text: string;
};

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Bu tarayıcı konum erişimini desteklemiyor."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 30_000,
    });
  });
}

async function currentPublicIp() {
  const response = await fetch("https://api64.ipify.org?format=json", {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("IP servisine ulaşılamadı.");
  const body = (await response.json()) as { ip?: unknown };
  if (typeof body.ip !== "string") throw new Error("IP servisi geçerli bir adres döndürmedi.");
  return toCourseNetworkCidr(body.ip);
}

export function CourseLocationNetwork({
  latitude,
  longitude,
  radiusMeters,
  onLocationChange,
  onIpAddressChange,
}: CourseLocationNetworkProps) {
  const [pending, setPending] = useState(false);
  const [accuracyMeters, setAccuracyMeters] = useState<number>();
  const [status, setStatus] = useState<UpdateStatus>();
  const selectedLocation = useMemo(
    () => findCampusLocationPreset(latitude, longitude),
    [latitude, longitude],
  );

  const mapUrls = useMemo(() => {
    const lat = Number.isFinite(latitude) ? latitude : 0;
    const lng = Number.isFinite(longitude) ? longitude : 0;
    const safeRadius = Number.isFinite(radiusMeters)
      ? Math.max(10, Math.min(2_000, radiusMeters))
      : 100;
    const tileSize = 256;
    const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
    const earthCircumference = 2 * Math.PI * 6_378_137;
    const targetRadiusPixels = 72;
    const idealZoom = Math.log2(
      (Math.cos((clampedLat * Math.PI) / 180) * earthCircumference * targetRadiusPixels) /
      (tileSize * safeRadius),
    );
    const zoom = Math.max(13, Math.min(18, Math.round(idealZoom)));
    const tileCount = 2 ** zoom;
    const latitudeRadians = (clampedLat * Math.PI) / 180;
    const worldX = ((lng + 180) / 360) * tileCount;
    const worldY = ((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2) * tileCount;
    const centerTileX = Math.floor(worldX);
    const centerTileY = Math.floor(worldY);
    const tiles = Array.from({ length: 9 }, (_, index) => {
      const offsetX = (index % 3) - 1;
      const offsetY = Math.floor(index / 3) - 1;
      const tileX = centerTileX + offsetX;
      const tileY = centerTileY + offsetY;
      const wrappedTileX = ((tileX % tileCount) + tileCount) % tileCount;
      return {
        key: `${zoom}-${wrappedTileX}-${tileY}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedTileX}/${tileY}.png`,
        left: `calc(50% + ${(tileX - worldX) * tileSize}px)`,
        top: `calc(50% + ${(tileY - worldY) * tileSize}px)`,
      };
    });
    return {
      detail: googleMapsLocationUrl(lat, lng),
      tiles,
      radiusPixels: safeRadius / (
        Math.cos((clampedLat * Math.PI) / 180) * earthCircumference / (tileSize * tileCount)
      ),
    };
  }, [latitude, longitude, radiusMeters]);

  function selectCampusLocation(locationId: string) {
    const location = CAMPUS_LOCATION_PRESETS.find((item) => item.id === locationId);
    if (!location) return;

    onLocationChange(location.latitude, location.longitude);
    onIpAddressChange(DEFAULT_CAMPUS_NETWORK_CIDR);
    setAccuracyMeters(undefined);
    setStatus({
      variant: "success",
      text: `${location.label} ders konumu olarak seçildi ve okul ağı ${DEFAULT_CAMPUS_NETWORK_CIDR} olarak ayarlandı.`,
    });
  }

  async function updateLocationAndIp() {
    setPending(true);
    setStatus(undefined);

    const [positionResult, ipResult] = await Promise.allSettled([
      currentPosition(),
      currentPublicIp(),
    ]);

    const locationUpdated = positionResult.status === "fulfilled";
    const ipUpdated = ipResult.status === "fulfilled";

    if (locationUpdated) {
      const { latitude: lat, longitude: lng, accuracy } = positionResult.value.coords;
      onLocationChange(lat, lng);
      setAccuracyMeters(Math.round(accuracy));
    }
    if (ipUpdated) onIpAddressChange(ipResult.value);

    if (locationUpdated && ipUpdated) {
      setStatus({
        variant: "success",
        text: "Konumunuz ve güncel genel IP adresiniz forma aktarıldı. Kaydetmeden önce bilgileri kontrol edin.",
      });
    } else if (locationUpdated) {
      setStatus({
        variant: "warning",
        text: "Konumunuz güncellendi ancak genel IP adresi alınamadı. Ağ bağlantınızı kontrol edip tekrar deneyin.",
      });
    } else if (ipUpdated) {
      setStatus({
        variant: "warning",
        text: `${geolocationErrorMessage(positionResult.reason)} IP adresiniz güncellendi.`,
      });
    } else {
      const locationMessage = geolocationErrorMessage(positionResult.reason);
      const ipMessage = ipResult.reason instanceof Error ? ipResult.reason.message : "IP adresi alınamadı.";
      setStatus({ variant: "error", text: `${locationMessage} ${ipMessage}` });
    }

    setPending(false);
  }

  return (
    <section className="grid gap-4 rounded-xl bg-surface-container-low p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
      <div className="flex min-w-0 flex-col justify-between gap-4">
        <div>
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MaterialIcon name="my_location" />
            </span>
            <div>
              <h3 className="font-label-lg text-label-lg text-on-surface">Dersin yapılacağı yer</h3>
              <p className="mt-1 max-w-prose font-body-sm text-body-sm leading-5 text-on-surface-variant">
                Kampüsten bir yer seçin veya şu an bulunduğunuz konumu kullanın.
              </p>
            </div>
          </div>

          <label htmlFor="campus-location-preset" className="mt-5 block font-label-sm text-label-sm text-on-surface">
            Kampüs konumu
            <select
              id="campus-location-preset"
              value={selectedLocation?.id ?? ""}
              onChange={(event) => selectCampusLocation(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 font-body-md text-body-md text-on-surface outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/25"
            >
              <option value="">Başka bir konum</option>
              <optgroup label="Kötekli Merkez Yerleşkesi">
                {CAMPUS_LOCATION_PRESETS.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <span className="mt-1.5 block font-body-sm text-body-sm leading-5 text-on-surface-variant">
              Bir kampüs noktası seçtiğinizde konum ve okul interneti bilgisi birlikte doldurulur.
            </span>
          </label>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-on-surface-variant">Enlem</dt>
              <dd className="mt-0.5 truncate font-medium tabular-nums text-on-surface">{latitude.toFixed(6)}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant">Boylam</dt>
              <dd className="mt-0.5 truncate font-medium tabular-nums text-on-surface">{longitude.toFixed(6)}</dd>
            </div>
          </dl>
          {accuracyMeters !== undefined && (
            <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
              Yaklaşık konum hassasiyeti: ±{accuracyMeters} metre
            </p>
          )}
        </div>

        <div>
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 sm:w-auto"
            disabled={pending}
            onClick={() => void updateLocationAndIp()}
          >
            <MaterialIcon name={pending ? "progress_activity" : "location_searching"} className={pending ? "animate-spin" : undefined} />
            {pending ? "Konum alınıyor…" : "Şu anki konumumu kullan"}
          </Button>
          <p className="mt-2 font-label-sm text-label-sm leading-5 text-on-surface-variant">
            Tarayıcınız konum izni isteyebilir. İnternet bilgisi de otomatik doldurulur.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-surface-container-lowest">
        <div
          className="relative h-56 overflow-hidden bg-surface-container lg:h-[calc(100%-2.75rem)] lg:min-h-64"
          role="img"
          aria-label={`Ders konumu ve ${Math.round(radiusMeters)} metre yoklama alanı`}
        >
          {mapUrls.tiles.map((tile) => (
            <span
              key={tile.key}
              aria-hidden="true"
              className="absolute size-64 bg-cover bg-center"
              style={{
                left: tile.left,
                top: tile.top,
                backgroundImage: `url(${tile.url})`,
              }}
            />
          ))}
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_65%,rgba(0,20,45,0.08))]" aria-hidden="true" />
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70 bg-primary/15 shadow-[0_2px_10px_rgba(0,77,122,0.18)]"
            style={{
              width: `${mapUrls.radiusPixels * 2}px`,
              height: `${mapUrls.radiusPixels * 2}px`,
            }}
            aria-hidden="true"
          />
          <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-md bg-white/95 px-2.5 py-1.5 font-label-sm text-label-sm text-primary shadow-sm" aria-hidden="true">
            {Math.round(radiusMeters)} m yoklama alanı
          </span>
          <span className="absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-full" aria-hidden="true">
            <span className="absolute left-1/2 top-full size-8 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/20" />
            <MaterialIcon name="location_on" filled className="relative text-[42px] text-primary drop-shadow-[0_3px_4px_rgba(0,20,45,0.35)]" />
          </span>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-1 right-1 z-[2] rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-neutral-700 hover:underline"
          >
            © OpenStreetMap
          </a>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface">
            <MaterialIcon name="location_on" className="text-base text-primary" />
            <span className="line-clamp-1">{selectedLocation?.label ?? "Seçilen konum"}</span>
          </span>
          <a
            href={mapUrls.detail}
            target="_blank"
            rel="noreferrer"
            className="font-label-sm text-label-sm text-primary underline-offset-4 hover:underline"
          >
            Google Maps&apos;te aç
          </a>
        </div>
      </div>

      {status && (
        <StatusMessage variant={status.variant} className="lg:col-span-2">
          {status.text}
        </StatusMessage>
      )}
    </section>
  );
}

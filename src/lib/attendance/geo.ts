const EARTH_RADIUS_METERS = 6_371_000;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function isValidCoordinates({ latitude, longitude }: Coordinates): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function haversineDistanceMeters(
  origin: Coordinates,
  destination: Coordinates,
): number {
  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
    throw new RangeError("Geçersiz koordinat değeri.");
  }

  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function isWithinAllowedRadius(
  school: Coordinates,
  student: Coordinates,
  allowedRadiusMeters: number,
): { allowed: boolean; distanceMeters: number } {
  if (!Number.isFinite(allowedRadiusMeters) || allowedRadiusMeters <= 0) {
    throw new RangeError("İzin verilen yarıçap sıfırdan büyük olmalıdır.");
  }

  const distanceMeters = haversineDistanceMeters(school, student);

  return {
    allowed: distanceMeters <= allowedRadiusMeters,
    distanceMeters,
  };
}

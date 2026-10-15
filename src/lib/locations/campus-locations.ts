export type CampusLocationPreset = {
  id: string;
  label: string;
  campus: string;
  latitude: number;
  longitude: number;
};

export const CAMPUS_LOCATION_PRESETS = [
  {
    id: "engineering-faculty",
    label: "Mühendislik Fakültesi",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1614908,
    longitude: 28.3759782,
  },
  {
    id: "education-faculty",
    label: "Eğitim Fakültesi",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1653836,
    longitude: 28.3735711,
  },
  {
    id: "science-faculty",
    label: "Fen Fakültesi",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1633869,
    longitude: 28.3736716,
  },
  {
    id: "letters-faculty",
    label: "Edebiyat Fakültesi",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1644206,
    longitude: 28.3740512,
  },
  {
    id: "economics-administrative-sciences-faculty",
    label: "İktisadi ve İdari Bilimler Fakültesi",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1646979,
    longitude: 28.3751663,
  },
  {
    id: "technology-faculty",
    label: "Teknoloji Fakültesi",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1659954,
    longitude: 28.3730685,
  },
  {
    id: "school-of-foreign-languages",
    label: "Yabancı Diller Yüksekokulu",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1696075,
    longitude: 28.3746319,
  },
  {
    id: "sports-sciences-faculty",
    label: "Spor Bilimleri Fakültesi",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1676628,
    longitude: 28.3750677,
  },
  {
    id: "informatics-department",
    label: "Enformatik",
    campus: "Kötekli Merkez Yerleşkesi",
    latitude: 37.1632951,
    longitude: 28.374013,
  },
] as const satisfies readonly CampusLocationPreset[];

export const DEFAULT_CAMPUS_LOCATION = CAMPUS_LOCATION_PRESETS[0];
export const DEFAULT_CAMPUS_NETWORK_CIDR = "194.27.153.159/8";

export function findCampusLocationPreset(latitude: number, longitude: number) {
  const coordinateTolerance = 0.000001;
  return CAMPUS_LOCATION_PRESETS.find(
    (location) =>
      Math.abs(location.latitude - latitude) <= coordinateTolerance &&
      Math.abs(location.longitude - longitude) <= coordinateTolerance,
  );
}

export function googleMapsLocationUrl(latitude: number, longitude: number) {
  const query = encodeURIComponent(`${latitude},${longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

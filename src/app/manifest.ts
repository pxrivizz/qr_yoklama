import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DersDevam | QR Kodlu Ders Yoklama Sistemi",
    short_name: "DersDevam",
    description:
      "QR kod, okul ağı ve konum doğrulamasıyla güvenli ders yoklaması.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fb",
    theme_color: "#022448",
    lang: "tr",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}

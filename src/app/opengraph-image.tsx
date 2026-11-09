import { ImageResponse } from "next/og";

export const alt = "DersDevam QR kodlu ders yoklama sistemi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f7f9fb",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "stretch",
            background: "#ffffff",
            border: "2px solid #e0e3e5",
            borderRadius: "36px",
            boxShadow: "0 28px 80px rgba(2, 36, 72, 0.10)",
            display: "flex",
            height: "100%",
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div
            style={{
              background: "#022448",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "58px",
              width: "36%",
            }}
          >
            <div style={{ color: "#6ffbbe", display: "flex", fontSize: 34, fontWeight: 700 }}>
              DersDevam
            </div>
            <div
              style={{
                alignItems: "center",
                display: "flex",
                height: 220,
                justifyContent: "center",
                position: "relative",
                width: 220,
              }}
            >
              <div style={{ borderLeft: "18px solid #6ffbbe", borderTop: "18px solid #6ffbbe", height: 78, left: 0, position: "absolute", top: 0, width: 78 }} />
              <div style={{ borderRight: "18px solid #6ffbbe", borderTop: "18px solid #6ffbbe", height: 78, position: "absolute", right: 0, top: 0, width: 78 }} />
              <div style={{ borderBottom: "18px solid #6ffbbe", borderLeft: "18px solid #6ffbbe", bottom: 0, height: 78, left: 0, position: "absolute", width: 78 }} />
              <div style={{ borderBottom: "18px solid #6ffbbe", borderRight: "18px solid #6ffbbe", bottom: 0, height: 78, position: "absolute", right: 0, width: 78 }} />
              <div style={{ background: "#6ffbbe", borderRadius: 999, height: 46, width: 46 }} />
            </div>
            <div style={{ color: "#adc8f5", display: "flex", fontSize: 22 }}>
              Hızlı · Güvenli · Doğrulanmış
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
              padding: "64px 72px",
            }}
          >
            <div style={{ color: "#006c49", display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Ders yoklama sistemi
            </div>
            <div style={{ color: "#191c1e", display: "flex", fontSize: 58, fontWeight: 750, letterSpacing: "-0.04em", lineHeight: 1.08, marginTop: 22 }}>
              QR kodla yoklama, anında devam takibi
            </div>
            <div style={{ color: "#52575d", display: "flex", fontSize: 27, lineHeight: 1.45, marginTop: 28 }}>
              Okul ağı, konum ve ders kaydı doğrulaması tek akışta.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

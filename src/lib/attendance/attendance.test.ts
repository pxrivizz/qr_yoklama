import { describe, expect, it } from "vitest";

import { haversineDistanceMeters, isWithinAllowedRadius } from "./geo";
import { isIpAllowed } from "./ip";
import { issueQrToken, verifyQrToken } from "./qr-token";
import { calculateNextSessionSlot, calculatePlannedSessionCount } from "./schedule";

const QR_SECRET = "test-icin-en-az-otuz-iki-karakter-qr-secret";

describe("QR token", () => {
  it("30 saniyelik, oturuma bağlı token üretir ve doğrular", async () => {
    const now = new Date("2026-08-11T10:00:00.000Z");
    const issued = await issueQrToken("session-1", QR_SECRET, now);
    const claims = await verifyQrToken(issued.token, QR_SECRET, now);

    expect(claims.sessionId).toBe("session-1");
    expect(claims.exp - claims.iat).toBe(30);
    expect(issued.nonceHash).toHaveLength(64);
  });

  it("tolerans penceresinden sonra süresi dolan tokeni reddeder", async () => {
    const now = new Date("2026-08-11T10:00:00.000Z");
    const issued = await issueQrToken("session-1", QR_SECRET, now);
    const expiredAt = new Date(now.getTime() + 34_000);

    await expect(verifyQrToken(issued.token, QR_SECRET, expiredAt)).rejects.toThrow();
  });

  it("farklı anahtarla imzalanmış tokeni reddeder", async () => {
    const issued = await issueQrToken("session-1", QR_SECRET);

    await expect(
      verifyQrToken(issued.token, "baska-bir-en-az-otuz-iki-karakter-secret"),
    ).rejects.toThrow();
  });
});

describe("konum doğrulama", () => {
  const school = { latitude: 41.0082, longitude: 28.9784 };

  it("aynı konumu sıfır metre kabul eder", () => {
    expect(haversineDistanceMeters(school, school)).toBe(0);
  });

  it("yarıçap içindeki ve dışındaki konumları ayırır", () => {
    const nearby = { latitude: 41.0086, longitude: 28.9784 };
    const farAway = { latitude: 41.02, longitude: 28.9784 };

    expect(isWithinAllowedRadius(school, nearby, 100).allowed).toBe(true);
    expect(isWithinAllowedRadius(school, farAway, 100).allowed).toBe(false);
  });
});

describe("IP doğrulama", () => {
  it("IPv4 CIDR aralığını doğrular", () => {
    expect(isIpAllowed("10.20.30.40", ["10.20.0.0/16"])).toBe(true);
    expect(isIpAllowed("10.21.30.40", ["10.20.0.0/16"])).toBe(false);
  });

  it("IPv6 aralığını ve IPv4-mapped adresleri destekler", () => {
    expect(isIpAllowed("2001:db8::10", ["2001:db8::/32"])).toBe(true);
    expect(isIpAllowed("::ffff:192.168.1.5", ["192.168.1.0/24"])).toBe(true);
  });

  it("bozuk adres veya boş whitelist için güvenli biçimde reddeder", () => {
    expect(isIpAllowed("gecersiz", ["10.0.0.0/8"])).toBe(false);
    expect(isIpAllowed("10.0.0.1", [])).toBe(false);
  });
});

describe("oturum planı", () => {
  it("planlanan toplam oturumu hesaplar", () => {
    expect(calculatePlannedSessionCount(3, 9)).toBe(27);
  });

  it("bir sonraki hafta ve sıra numarasını hesaplar", () => {
    expect(calculateNextSessionSlot(0, 3)).toEqual({
      weekNumber: 1,
      sessionIndexInWeek: 1,
    });
    expect(calculateNextSessionSlot(3, 3)).toEqual({
      weekNumber: 2,
      sessionIndexInWeek: 1,
    });
  });
});

describe("QR kod metni ayrıştırma", () => {
  function tokenFromQrValue(rawValue: string) {
    const value = rawValue.trim();
    try {
      const url = new URL(value, "http://localhost");
      return url.searchParams.get("token") ?? (value.split(".").length === 3 ? value : "");
    } catch {
      return value.split(".").length === 3 ? value : "";
    }
  }

  it("tam URL içerisinden token parametresini çıkarır", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiIxMjMifQ.signature";
    const url = `https://yoklama.mu.edu.tr/tara?token=${token}`;
    expect(tokenFromQrValue(url)).toBe(token);
  });

  it("göreli (relative) /tara?token= URL'lerini güvenle ayrıştırır", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiIxMjMifQ.signature";
    const relativeUrl = `/tara?token=${token}`;
    expect(tokenFromQrValue(relativeUrl)).toBe(token);
  });

  it("başında veya sonunda boşluk olan URL'leri temizler ve tokenı bulur", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiIxMjMifQ.signature";
    const padded = `  https://yoklama.mu.edu.tr/tara?token=${token}  \n`;
    expect(tokenFromQrValue(padded)).toBe(token);
  });

  it("ham 3 parçalı JWT token değerini kabul eder", () => {
    const token = "header.payload.signature";
    expect(tokenFromQrValue(token)).toBe(token);
  });

  it("geçersiz veya alakasız metinlerde boş string döner", () => {
    expect(tokenFromQrValue("https://google.com/search?q=test")).toBe("");
    expect(tokenFromQrValue("rastgele-gecersiz-kod")).toBe("");
    expect(tokenFromQrValue("")).toBe("");
  });
});

describe("devamsızlık limiti durum kontrolleri", () => {
  function computeLimitStatus(
    isMandatory: boolean,
    limit: number | null,
    totalAbsenceCount: number,
  ) {
    const hasLimit = isMandatory && limit !== null && limit > 0;
    const isFailed = hasLimit && totalAbsenceCount > limit;
    const isAtLimit = hasLimit && totalAbsenceCount === limit;
    const isNearLimit = hasLimit && totalAbsenceCount === limit - 1;
    const remainingAllowance = hasLimit ? Math.max(0, limit - totalAbsenceCount) : null;
    return { hasLimit, isFailed, isAtLimit, isNearLimit, remainingAllowance };
  }

  it("zorunlu olmayan veya limitsiz derslerde devamsızlık kuralı işletilmez", () => {
    const res = computeLimitStatus(false, 4, 10);
    expect(res.hasLimit).toBe(false);
    expect(res.isFailed).toBe(false);
    expect(res.isAtLimit).toBe(false);
  });

  it("sınırı aşan devamsızlıkta isFailed=true döner", () => {
    const res = computeLimitStatus(true, 4, 5);
    expect(res.hasLimit).toBe(true);
    expect(res.isFailed).toBe(true);
    expect(res.remainingAllowance).toBe(0);
  });

  it("tam sınırda olan devamsızlıkta isAtLimit=true döner", () => {
    const res = computeLimitStatus(true, 4, 4);
    expect(res.hasLimit).toBe(true);
    expect(res.isAtLimit).toBe(true);
    expect(res.isFailed).toBe(false);
    expect(res.remainingAllowance).toBe(0);
  });

  it("sınıra 1 kala isNearLimit=true döner", () => {
    const res = computeLimitStatus(true, 4, 3);
    expect(res.hasLimit).toBe(true);
    expect(res.isNearLimit).toBe(true);
    expect(res.remainingAllowance).toBe(1);
  });

  it("güvenli bölgede kalan hak doğru hesaplanır", () => {
    const res = computeLimitStatus(true, 4, 1);
    expect(res.hasLimit).toBe(true);
    expect(res.isFailed).toBe(false);
    expect(res.isAtLimit).toBe(false);
    expect(res.isNearLimit).toBe(false);
    expect(res.remainingAllowance).toBe(3);
  });
});

describe("Türkçe isim normalizasyonu", () => {
  it("büyük İ ve I harflerini tutarlı şekilde normalize eder", async () => {
    const { normalizePersonName } = await import("@/lib/students/name");
    expect(normalizePersonName("İSMAİL IŞIK")).toBe("ismail isik");
    expect(normalizePersonName("ismail ışık")).toBe("ismail isik");
    expect(normalizePersonName("ŞÜKRÜ ÇAĞLAYAN")).toBe("sukru caglayan");
  });
});


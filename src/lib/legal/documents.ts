export const LEGAL_DOCUMENT_VERSION = "2026-10-09";
export const LEGAL_DOCUMENT_DATE_LABEL = "9 Ekim 2026";
export const KVKK_NOTICE_ENABLED = false;

export const COOKIE_NOTICE_STORAGE_KEY =
  `dersdevam:cookie-notice:${LEGAL_DOCUMENT_VERSION}`;

export const legalDocuments = [
  ...(KVKK_NOTICE_ENABLED
    ? [{ href: "/kvkk", label: "KVKK Aydınlatma Metni" } as const]
    : []),
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/kullanim-kosullari", label: "Kullanım Koşulları" },
] as const;

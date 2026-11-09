const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredUrl) {
    return new URL(LOCAL_SITE_URL);
  }

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(LOCAL_SITE_URL);
  }
}

import ipaddr from "ipaddr.js";

export type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

export function getRequestContext(request: Request): RequestContext {
  const configuredHeader = process.env.TRUSTED_PROXY_IP_HEADER?.toLowerCase();
  const trustedHeader =
    configuredHeader === "x-real-ip" ||
    configuredHeader === "cf-connecting-ip" ||
    configuredHeader === "x-forwarded-for"
      ? configuredHeader
      : undefined;
  const rawIp = trustedHeader
    ? request.headers.get(trustedHeader)?.split(",")[0]?.trim()
    : undefined;

  let ipAddress: string | undefined;
  if (rawIp && rawIp.length <= 64) {
    try {
      const parsed = ipaddr.parse(rawIp.replace(/^\[|\]$/g, ""));
      ipAddress =
        parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()
          ? parsed.toIPv4Address().toString()
          : parsed.toNormalizedString();
    } catch {
      ipAddress = undefined;
    }
  }

  const rawUserAgent = request.headers.get("user-agent")?.trim();
  const userAgent = rawUserAgent ? rawUserAgent.slice(0, 512) : undefined;

  return { ipAddress, userAgent };
}

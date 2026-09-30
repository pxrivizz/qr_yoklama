import ipaddr from "ipaddr.js";

export function toSingleHostCidr(rawIp: string): string {
  const parsed = ipaddr.parse(rawIp.trim().replace(/^\[|\]$/g, ""));
  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
    return `${parsed.toIPv4Address().toString()}/32`;
  }

  return `${parsed.toNormalizedString()}/${parsed.kind() === "ipv4" ? 32 : 128}`;
}

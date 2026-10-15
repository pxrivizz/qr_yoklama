import ipaddr from "ipaddr.js";

export function toCourseNetworkCidr(rawIp: string): string {
  const parsed = ipaddr.parse(rawIp.trim().replace(/^\[|\]$/g, ""));
  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
    return `${parsed.toIPv4Address().toString()}/8`;
  }

  return `${parsed.toNormalizedString()}/${parsed.kind() === "ipv4" ? 8 : 128}`;
}

import ipaddr from "ipaddr.js";

function normalizeIpAddress(value: string): string {
  const trimmed = value.trim();
  const withoutBrackets = trimmed.replace(/^\[|\]$/g, "");
  const parsed = ipaddr.parse(withoutBrackets);

  if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
    return parsed.toIPv4Address().toString();
  }

  return parsed.toNormalizedString();
}

export function isIpAllowed(ipAddress: string, allowedRanges: string[]): boolean {
  if (allowedRanges.length === 0) {
    return false;
  }

  try {
    const normalizedAddress = normalizeIpAddress(ipAddress);
    const address = ipaddr.parse(normalizedAddress);

    return allowedRanges.some((range) => {
      try {
        const [network, prefixLength] = ipaddr.parseCIDR(range.trim());
        const comparableAddress =
          address instanceof ipaddr.IPv6 && address.isIPv4MappedAddress()
            ? address.toIPv4Address()
            : address;

        return comparableAddress.kind() === network.kind()
          ? comparableAddress.match(network, prefixLength)
          : false;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

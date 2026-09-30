import { describe, expect, it } from "vitest";

import { toSingleHostCidr } from "./ip-address";

describe("toSingleHostCidr", () => {
  it("IPv4 adresini tek-host CIDR biçimine çevirir", () => {
    expect(toSingleHostCidr("194.27.153.130")).toBe("194.27.153.130/32");
  });

  it("IPv6 adresini normalize edip /128 ekler", () => {
    expect(toSingleHostCidr("2001:db8::1")).toBe("2001:db8:0:0:0:0:0:1/128");
  });

  it("IPv4 eşlemeli IPv6 adresini IPv4 olarak döndürür", () => {
    expect(toSingleHostCidr("::ffff:192.0.2.10")).toBe("192.0.2.10/32");
  });

  it("geçersiz adresi reddeder", () => {
    expect(() => toSingleHostCidr("not-an-ip")).toThrow();
  });
});

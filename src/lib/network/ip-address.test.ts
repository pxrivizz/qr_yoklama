import { describe, expect, it } from "vitest";

import { toCourseNetworkCidr } from "./ip-address";

describe("toCourseNetworkCidr", () => {
  it("IPv4 adresini ders ağı için /8 CIDR biçimine çevirir", () => {
    expect(toCourseNetworkCidr("194.27.153.130")).toBe("194.27.153.130/8");
  });

  it("IPv6 adresini normalize edip /128 ekler", () => {
    expect(toCourseNetworkCidr("2001:db8::1")).toBe("2001:db8:0:0:0:0:0:1/128");
  });

  it("IPv4 eşlemeli IPv6 adresini /8 IPv4 ağı olarak döndürür", () => {
    expect(toCourseNetworkCidr("::ffff:192.0.2.10")).toBe("192.0.2.10/8");
  });

  it("geçersiz adresi reddeder", () => {
    expect(() => toCourseNetworkCidr("not-an-ip")).toThrow();
  });
});

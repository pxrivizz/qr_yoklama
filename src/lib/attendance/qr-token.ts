import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

const TOKEN_ISSUER = "okul-yoklama";
const TOKEN_AUDIENCE = "attendance-scan";
export const QR_TOKEN_LIFETIME_SECONDS = 30;
export const QR_TOKEN_CLOCK_TOLERANCE_SECONDS = 3;

const qrClaimsSchema = z.object({
  sessionId: z.string().min(1),
  nonce: z.string().min(16),
  iat: z.number().int(),
  exp: z.number().int(),
});

export type QrTokenClaims = z.infer<typeof qrClaimsSchema>;

export type IssuedQrToken = {
  token: string;
  claims: QrTokenClaims;
  nonceHash: string;
  signature: string;
};

function signingKey(secret: string): Uint8Array {
  if (secret.length < 32) {
    throw new Error("QR imzalama anahtarı en az 32 karakter olmalıdır.");
  }

  return new TextEncoder().encode(secret);
}

export function hashTokenValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function issueQrToken(
  sessionId: string,
  secret: string,
  now = new Date(),
): Promise<IssuedQrToken> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + QR_TOKEN_LIFETIME_SECONDS;
  const nonce = randomBytes(24).toString("base64url");

  const token = await new SignJWT({ sessionId, nonce })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(signingKey(secret));

  const signature = token.split(".")[2];
  if (!signature) {
    throw new Error("QR token imzası üretilemedi.");
  }

  return {
    token,
    claims: { sessionId, nonce, iat: issuedAt, exp: expiresAt },
    nonceHash: hashTokenValue(nonce),
    signature,
  };
}

export async function verifyQrToken(
  token: string,
  secret: string,
  now = new Date(),
): Promise<QrTokenClaims> {
  const { payload } = await jwtVerify(token, signingKey(secret), {
    algorithms: ["HS256"],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    clockTolerance: QR_TOKEN_CLOCK_TOLERANCE_SECONDS,
    currentDate: now,
  });

  return qrClaimsSchema.parse(payload);
}

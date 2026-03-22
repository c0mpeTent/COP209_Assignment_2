import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { CookieOptions } from "express";
import type { User } from "@prisma/client";

type PublicUser = Pick<User, "id" | "name" | "email" | "avatarUrl">;
const sanitizeUser = (user: PublicUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
});

const hashRefreshToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const getCookieOptions = (
  maxAge: number,
  nodeEnv = process.env.NODE_ENV
): CookieOptions => ({
  httpOnly: true,
  secure: nodeEnv === "production",
  sameSite: "lax",
  maxAge,
});


test("sanitizeUser returns only safe profile fields", () => {
  const sanitized = sanitizeUser({
    id: "user-1",
    name: "Om Meena",
    email: "om@example.com",
    avatarUrl: "https://example.com/avatar.png",
  });

  assert.deepEqual(sanitized, {
    id: "user-1",
    name: "Om Meena",
    email: "om@example.com",
    avatarUrl: "https://example.com/avatar.png",
  });
});

test("hashRefreshToken is deterministic and does not leak raw token", () => {
  const rawToken = "refresh-token-value";
  const firstHash = hashRefreshToken(rawToken);
  const secondHash = hashRefreshToken(rawToken);

  assert.equal(firstHash, secondHash);
  assert.notEqual(firstHash, rawToken);
  assert.equal(firstHash.length, 64);
});

test("getCookieOptions enables secure cookies in production only", () => {
  const productionOptions = getCookieOptions(1000, "production");
  const developmentOptions = getCookieOptions(1000, "development");

  assert.equal(productionOptions.httpOnly, true);
  assert.equal(productionOptions.secure, true);
  assert.equal(productionOptions.sameSite, "lax");
  assert.equal(developmentOptions.secure, false);
});
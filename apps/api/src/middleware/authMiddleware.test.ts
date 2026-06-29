import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { SignJWT } from "jose";

import type { AppVariables } from "../types";
import { authMiddleware } from "./authMiddleware";

// Bramka auth musi odrzucać KAŻDE żądanie bez ważnego tokenu, zanim dotknie DB
// czy danych serwera. Testujemy ją runtime'owo: mini-app Hono z samym
// middlewarem i chronioną trasą, strzelana przez `app.request()` (bez sieci,
// bez DB — ścieżki odrzucenia kończą przed odczytem magazynu sesji).
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-1234";

function protectedApp() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("/protected", authMiddleware);
  app.get("/protected", (c) => c.json({ userId: c.get("userId") }));
  return app;
}

describe("authMiddleware", () => {
  it("odrzuca brak tokenu → 401", async () => {
    const res = await protectedApp().request("/protected");
    expect(res.status).toBe(401);
  });

  it("odrzuca nagłówek bez schematu Bearer → 401", async () => {
    const res = await protectedApp().request("/protected", {
      headers: { authorization: "garbage-no-bearer" },
    });
    expect(res.status).toBe(401);
  });

  it("odrzuca podrobiony token JWT → 401", async () => {
    const res = await protectedApp().request("/protected", {
      headers: { authorization: "Bearer not-a-real-jwt" },
    });
    expect(res.status).toBe(401);
  });

  it("odrzuca token podpisany INNYM sekretem → 401", async () => {
    const forged = await new SignJWT({ userId: "1", username: "x", avatar: null })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("a-completely-different-secret-not-ours-xx"));
    const res = await protectedApp().request("/protected", {
      headers: { authorization: `Bearer ${forged}` },
    });
    expect(res.status).toBe(401);
  });

  it("odrzuca cookie z nieprawidłowym tokenem → 401", async () => {
    const res = await protectedApp().request("/protected", {
      headers: { cookie: "jh_token=bogus" },
    });
    expect(res.status).toBe(401);
  });
});

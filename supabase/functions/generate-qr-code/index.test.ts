import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { resolveGenerateQrToken } from "./index.ts";

Deno.test("resolveGenerateQrToken prefers connection token over env fallbacks", () => {
  assertEquals(
    resolveGenerateQrToken("connection-token", {
      UAZAPI_INSTANCE_TOKEN: "env-instance-token",
      UAZAPI_TOKEN: "env-token",
      UAZAPI_API_KEY: "env-api-key",
    }),
    "connection-token",
  );
});

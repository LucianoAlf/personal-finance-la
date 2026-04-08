import {
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  getConnectionLookupToken,
  getTranscriptionToken,
} from "./index.ts";

Deno.test("getConnectionLookupToken prefers payload token over env fallback", () => {
  assertEquals(
    getConnectionLookupToken(
      { token: "payload-token" },
      "env-token",
    ),
    "payload-token",
  );
});

Deno.test("getTranscriptionToken prefers matched connection token over env fallbacks", () => {
  assertEquals(
    getTranscriptionToken(
      { instance_token: "connection-token" },
      {
        UAZAPI_INSTANCE_TOKEN: "env-instance-token",
        UAZAPI_TOKEN: "env-token",
        UAZAPI_API_KEY: "env-api-key",
      },
    ),
    "connection-token",
  );
});

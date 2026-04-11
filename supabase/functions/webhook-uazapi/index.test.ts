import {
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  getConnectionLookupToken,
  getInboundSenderPhone,
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

Deno.test("getInboundSenderPhone prefers sender_pn for group messages", () => {
  assertEquals(
    getInboundSenderPhone({
      sender: "114838969827528@lid",
      sender_pn: "5521981278047@s.whatsapp.net",
    }),
    "5521981278047",
  );
});

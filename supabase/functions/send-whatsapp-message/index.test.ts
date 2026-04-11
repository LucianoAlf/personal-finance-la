import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { resolveOutboundWhatsAppConfig } from "./index.ts";

Deno.test("resolveOutboundWhatsAppConfig requires canonical readiness", () => {
  assertThrows(
    () =>
      resolveOutboundWhatsAppConfig(
        {
          content: "oi",
        },
        {
          connected: true,
          status: "connecting",
          phone_number: "5521999999999",
          instance_token: "db-token",
        },
        {
          UAZAPI_BASE_URL: "https://custom.example",
        },
      ),
    Error,
    "WhatsApp connection is not ready",
  );
});

Deno.test("resolveOutboundWhatsAppConfig uses chat_jid when provided", () => {
  assertEquals(
    resolveOutboundWhatsAppConfig(
      {
        content: "oi",
        user_id: "00000000-0000-0000-0000-000000000001",
        chat_jid: " 5521981278047-1555326211@g.us ",
      },
      {
        connected: true,
        status: "connected",
        phone_number: "5521999999999",
        instance_token: "db-token",
      },
      {
        UAZAPI_BASE_URL: "https://custom.example/",
      },
    ),
    {
      baseUrl: "https://custom.example",
      token: "db-token",
      phoneNumber: "5521981278047-1555326211@g.us",
    },
  );
});

Deno.test("resolveOutboundWhatsAppConfig chat_jid requires user_id", () => {
  assertThrows(
    () =>
      resolveOutboundWhatsAppConfig(
        {
          content: "oi",
          chat_jid: "5521981278047-1555326211@g.us",
        },
        {
          connected: true,
          status: "connected",
          phone_number: "5521999999999",
          instance_token: "db-token",
        },
        { UAZAPI_BASE_URL: "https://custom.example/" },
      ),
    Error,
    "user_id is required when sending to chat_jid",
  );
});

Deno.test("resolveOutboundWhatsAppConfig prefers DB token and canonical phone", () => {
  assertEquals(
    resolveOutboundWhatsAppConfig(
      {
        content: "oi",
      },
      {
        connected: true,
        status: "connected",
        phone_number: "5521999999999",
        instance_token: "db-token",
      },
      {
        UAZAPI_BASE_URL: "https://custom.example/",
        UAZAPI_INSTANCE_TOKEN: "env-instance-token",
        UAZAPI_TOKEN: "env-token",
        UAZAPI_API_KEY: "env-api-key",
      },
    ),
    {
      baseUrl: "https://custom.example",
      token: "db-token",
      phoneNumber: "5521999999999",
    },
  );
});

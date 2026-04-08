import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildConnectedUpdate,
  buildConnectingUpdate,
  buildDisconnectedUpdate,
} from "./whatsapp-connection-state.ts";

Deno.test("buildConnectedUpdate maps phone to canonical connected fragment", () => {
  assertEquals(buildConnectedUpdate("5521998250178"), {
    connected: true,
    logged_in: true,
    status: "connected",
    phone_number: "5521998250178",
  });
});

Deno.test("buildDisconnectedUpdate maps reason to canonical disconnected fragment", () => {
  assertEquals(buildDisconnectedUpdate("connection_closed"), {
    connected: false,
    logged_in: false,
    status: "disconnected",
    last_disconnect_reason: "connection_closed",
  });
});

Deno.test("buildConnectingUpdate yields canonical connecting fragment", () => {
  assertEquals(buildConnectingUpdate(), {
    connected: false,
    logged_in: false,
    status: "connecting",
  });
});

Deno.test("optional now sets updated_at and last_disconnect on disconnect", () => {
  const fixed = new Date("2026-04-08T12:00:00.000Z");
  const u = buildDisconnectedUpdate("timeout", fixed);
  assertEquals(u.updated_at, "2026-04-08T12:00:00.000Z");
  assertEquals(u.last_disconnect, "2026-04-08T12:00:00.000Z");
});

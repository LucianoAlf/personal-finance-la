/**
 * Canonical WhatsApp connection state fragments for DB updates.
 * Pure helpers: no I/O.
 */

export type CanonicalConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface CanonicalConnectionUpdate {
  connected?: boolean;
  logged_in?: boolean;
  status?: CanonicalConnectionStatus;
  phone_number?: string;
  qr_code?: string;
  qr_code_expires_at?: string;
  last_disconnect?: string;
  last_disconnect_reason?: string;
  updated_at?: string;
}

function isoFromNow(now?: Date): string | undefined {
  if (now === undefined) return undefined;
  return now.toISOString();
}

export function buildConnectingUpdate(now?: Date): CanonicalConnectionUpdate {
  const update: CanonicalConnectionUpdate = {
    connected: false,
    logged_in: false,
    status: "connecting",
  };
  const iso = isoFromNow(now);
  if (iso !== undefined) update.updated_at = iso;
  return update;
}

export function buildConnectedUpdate(
  phoneNumber: string,
  now?: Date,
): CanonicalConnectionUpdate {
  const update: CanonicalConnectionUpdate = {
    connected: true,
    logged_in: true,
    status: "connected",
    phone_number: phoneNumber,
  };
  const iso = isoFromNow(now);
  if (iso !== undefined) update.updated_at = iso;
  return update;
}

export function buildDisconnectedUpdate(
  reason: string,
  now?: Date,
): CanonicalConnectionUpdate {
  const update: CanonicalConnectionUpdate = {
    connected: false,
    logged_in: false,
    status: "disconnected",
    last_disconnect_reason: reason,
  };
  const iso = isoFromNow(now);
  if (iso !== undefined) {
    update.updated_at = iso;
    update.last_disconnect = iso;
  }
  return update;
}

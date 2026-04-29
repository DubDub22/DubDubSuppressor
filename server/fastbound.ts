/**
 * FastBound API client for DubDub22 suppressor dispositions.
 *
 * Docs: https://www.fastbound.com/faq/open-api/
 * Auth: HTTP Basic — API Key as username or password
 * Rate limit: 60 requests/min per API key
 *
 * Env vars:
 *   FASTBOUND_ACCOUNT  – FastBound account number
 *   FASTBOUND_API_KEY  – FastBound API key
 *   FASTBOUND_AUDIT_USER – email of FastBound user for X-AuditUser header
 *   FASTBOUND_BASE_URL – defaults to https://api.fastbound.com/api/v1
 */

import { pool } from "./db";

const BASE =
  process.env.FASTBOUND_BASE_URL?.replace(/\/$/, "") ??
  "https://api.fastbound.com/api/v1";

const ACCOUNT = process.env.FASTBOUND_ACCOUNT;
const API_KEY = process.env.FASTBOUND_API_KEY;
const AUDIT_USER = process.env.FASTBOUND_AUDIT_USER;

function authHeaders() {
  if (!ACCOUNT || !API_KEY) {
    throw new Error("FastBound credentials not configured (FASTBOUND_ACCOUNT / FASTBOUND_API_KEY)");
  }
  const b64 = Buffer.from(`${ACCOUNT}:${API_KEY}`).toString("base64");
  return {
    Authorization: `Basic ${b64}`,
    "Content-Type": "application/json",
    ...(AUDIT_USER ? { "X-AuditUser": AUDIT_USER } : {}),
  };
}

async function fbFetch(path: string, init?: RequestInit) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FastBound ${res.status} ${path} – ${body}`);
  }
  return res.json();
}

// ── Types ────────────────────────────────────────────────────────────────────

export type FastBoundItem = {
  serialNumber: string;
  make?: string;
  model?: string;
  caliber?: string;
  type?: string;           // "Suppressor"
  acquisitionId?: string;   // links to item already in inventory
};

export type FastBoundContact = {
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  email?: string;
  phone?: string;
  fflNumber?: string;
};

export type CreateDispositionResult = {
  id: string;
  status: string;
};

// ── API Methods ──────────────────────────────────────────────────────────────

/**
 * Create a pending disposition with dealer contact + items (serials).
 * Returns the disposition ID for later commit.
 *
 * FastBound flow:
 *   1. Create pending disposition  →  POST /dispositions
 *   2. Add contact                 →  POST /dispositions/{id}/contact
 *   3. Add items                   →  POST /dispositions/{id}/items
 *
 * Alternatively use Dispositions/CreateAndCommit but we want pending first
 * so the dealer can handle Form 3 separately.
 */
export async function createPendingDisposition(
  dealer: FastBoundContact,
  items: FastBoundItem[],
): Promise<CreateDispositionResult> {
  // 1. Create empty pending disposition
  const disp: any = await fbFetch("/dispositions", {
    method: "POST",
    body: JSON.stringify({
      disposeDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      disposeType: "Sold",
    }),
  });

  const dispositionId = disp.id;
  if (!dispositionId) throw new Error("No disposition ID returned from FastBound");

  // 2. Attach dealer contact
  await fbFetch(`/dispositions/${dispositionId}/contact`, {
    method: "POST",
    body: JSON.stringify({
      name: dealer.name,
      addressLine1: dealer.addressLine1,
      city: dealer.city,
      state: dealer.state,
      postalCode: dealer.postalCode,
      email: dealer.email,
      phone: dealer.phone,
      fflNumber: dealer.fflNumber,
    }),
  });

  // 3. Add items (serials) one by one
  for (const item of items) {
    await fbFetch(`/dispositions/${dispositionId}/items`, {
      method: "POST",
      body: JSON.stringify({
        serialNumber: item.serialNumber,
        make: item.make ?? "Double T Tactical",
        model: item.model ?? "DubDub22 Suppressor",
        caliber: item.caliber ?? "Multi",
        type: item.type ?? "Suppressor",
        ...(item.acquisitionId ? { acquisitionId: item.acquisitionId } : {}),
      }),
    });
  }

  return { id: dispositionId, status: "pending" };
}

/**
 * Commit a pending disposition after Form 3 is approved.
 * Pushes tracking number into the disposition before committing.
 */
export async function commitDisposition(
  dispositionId: string,
  trackingNumber: string,
): Promise<void> {
  // Add tracking to disposition (FastBound stores shipment info)
  await fbFetch(`/dispositions/${dispositionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      trackingNumber,
      shippedDate: new Date().toISOString().slice(0, 10),
    }),
  });

  // Commit the disposition
  await fbFetch(`/dispositions/${dispositionId}/commit`, {
    method: "POST",
  });
}

/**
 * Look up a contact by FFL number (external ID or FFL field).
 * Returns FastBound contact ID if found.
 */
export async function findContactByFFL(fflNumber: string): Promise<string | null> {
  try {
    const res: any = await fbFetch(
      `/contacts?search=${encodeURIComponent(fflNumber)}&limit=5`,
    );
    const match = (res.data || res).find(
      (c: any) => c.fflNumber === fflNumber || c.ffl === fflNumber,
    );
    return match?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Store the FastBound disposition ID on our submission row.
 */
export async function saveDispositionId(
  submissionId: string,
  dispositionId: string,
): Promise<void> {
  await pool.query(
    `UPDATE submissions SET fastbound_disposition_id = $1 WHERE id = $2`,
    [dispositionId, submissionId],
  );
}

/**
 * Retrieve the FastBound disposition ID for a submission.
 */
export async function getDispositionId(
  submissionId: string,
): Promise<string | null> {
  const res = await pool.query(
    `SELECT fastbound_disposition_id FROM submissions WHERE id = $1`,
    [submissionId],
  );
  return res.rows[0]?.fastbound_disposition_id ?? null;
}

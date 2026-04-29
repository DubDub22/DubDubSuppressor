/**
 * ShipStation API client for DubDub22 label generation.
 *
 * Docs: https://docs.shipstation.com/apis/openapi/labels/create_label
 * Auth: HTTP Basic — API Key + API Secret
 * Carrier: USPS (stamps_com)
 *
 * Env vars:
 *   SHIPSTATION_API_KEY
 *   SHIPSTATION_API_SECRET
 *   SHIPSTATION_BASE_URL – defaults to https://ssapi.shipstation.com
 */

import { pool } from "./db";

const BASE =
  process.env.SHIPSTATION_BASE_URL ?? "https://ssapi.shipstation.com";

const API_KEY = process.env.SHIPSTATION_API_KEY;
const API_SECRET = process.env.SHIPSTATION_API_SECRET;

function authHeaders() {
  if (!API_KEY || !API_SECRET) {
    throw new Error(
      "ShipStation credentials not configured (SHIPSTATION_API_KEY / SHIPSTATION_API_SECRET)",
    );
  }
  const b64 = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  return {
    Authorization: `Basic ${b64}`,
    "Content-Type": "application/json",
  };
}

async function ssFetch(path: string, init?: RequestInit) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ShipStation ${res.status} ${path} – ${body}`);
  }
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────

export type ShipTo = {
  name: string;
  companyName?: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode?: string; // default "US"
};

export type PackageDetails = {
  weightOz: number; // suppressor ~9.6 oz
  length?: number; // inches
  width?: number;
  height?: number;
  packageCode?: string; // e.g. "medium_flat_rate_box" or "package"
};

export type CreateLabelResult = {
  labelId: string;
  trackingNumber: string;
  labelPdfUrl: string;
  shipmentId: string;
  cost: number;
};

// ── API Methods ───────────────────────────────────────────────────────────

const SHIP_FROM = {
  companyName: "Double T Tactical / DubDub22",
  name: "Tom Flores",
  phone: "210-XXX-XXXX", // update with real phone
  addressLine1: "Floresville, TX", // update with real address
  city: "Floresville",
  state: "TX",
  postalCode: "78114",
  countryCode: "US",
};

/**
 * Create a USPS shipping label and return tracking + PDF.
 * Uses v2/labels endpoint (recommended).
 */
export async function createLabel(
  shipTo: ShipTo,
  pkg: PackageDetails,
  serviceCode = "usps_priority_mail",
): Promise<CreateLabelResult> {
  const payload = {
    shipment: {
      carrierCode: "stamps_com",
      serviceCode,
      shipFrom: SHIP_FROM,
      shipTo: {
        ...shipTo,
        countryCode: shipTo.countryCode ?? "US",
        addressResidentialIndicator: "yes",
      },
      packages: [
        {
          weight: { value: pkg.weightOz, unit: "ounce" },
          ...(pkg.packageCode
            ? { packageCode: pkg.packageCode }
            : pkg.length
              ? {
                  dimensions: {
                    length: pkg.length,
                    width: pkg.width ?? 6,
                    height: pkg.height ?? 4,
                    unit: "inch",
                  },
                }
              : {}),
        },
      ],
      confirmation: "none",
      insuranceProvider: "none",
    },
    labelFormat: "pdf",
    labelLayout: "4x6",
  };

  const res: any = await ssFetch("/v2/labels", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    labelId: res.labelId,
    trackingNumber: res.trackingNumber,
    labelPdfUrl: res.labelDownload?.pdf ?? res.label_url ?? "",
    shipmentId: res.shipmentId,
    cost: res.shipmentCost?.amount ?? 0,
  };
}

/**
 * Save label info to submission row.
 */
export async function saveLabelInfo(
  submissionId: string,
  label: CreateLabelResult,
): Promise<void> {
  await pool.query(
    `UPDATE submissions
        SET tracking_number = $1,
            shipstation_label_id = $2,
            shipstation_shipment_id = $3,
            label_pdf_url = $4,
            shipped_at = NOW()::text
      WHERE id = $5`,
    [
      label.trackingNumber,
      label.labelId,
      label.shipmentId,
      label.labelPdfUrl,
      submissionId,
    ],
  );
}

/**
 * Void a label (within 28 days, unused).
 */
export async function voidLabel(labelId: string): Promise<void> {
  await ssFetch(`/v2/labels/${labelId}/void`, { method: "POST" });
}

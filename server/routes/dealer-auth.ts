import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db, pool } from "../db";
import { dealers } from "@shared/dealers-schema";
import { eq, and } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    dealerId?: string;
    dealerEmail?: string;
  }
}

export function requireDealerAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.dealerId) {
    return res.status(401).json({ ok: false, error: "authentication_required" });
  }
  next();
}

export function registerDealerAuthRoutes(app: Express) {
  // ── Register ─────────────────────────────────────────────────────────────
  app.post("/api/dealer/auth/register", async (req, res) => {
    try {
      const {
        email, password, businessName, contactName, phone,
        fflNumber, ein, einType, address, city, state, zip
      } = req.body || {};

      if (!email || !password || !businessName || !contactName || !fflNumber) {
        return res.status(400).json({ ok: false, error: "missing_required_fields" });
      }
      if (password.length < 8) {
        return res.status(400).json({ ok: false, error: "password_too_short", message: "Password must be at least 8 characters" });
      }
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        return res.status(400).json({ ok: false, error: "invalid_email" });
      }

      // Check if email already registered
      const existing = await db.select({ id: dealers.id })
        .from(dealers)
        .where(eq(dealers.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ ok: false, error: "email_already_registered", message: "This email is already registered. Please log in instead." });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [dealer] = await db.insert(dealers).values({
        email: email.toLowerCase(),
        passwordHash,
        businessName,
        contactName,
        phone: phone || null,
        fflLicenseNumber: fflNumber,
        ein: ein || null,
        einType: einType || null,
        businessAddress: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        source: "dealer_registration",
        tier: "Standard",
      }).returning({ id: dealers.id });

      req.session!.dealerId = dealer.id;
      req.session!.dealerEmail = email.toLowerCase();

      return res.json({ ok: true, dealerId: dealer.id });
    } catch (err: any) {
      console.error("dealer_register_error", err);
      return res.status(500).json({ ok: false, error: "registration_failed" });
    }
  });

  // ── Login ────────────────────────────────────────────────────────────────
  app.post("/api/dealer/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "missing_credentials" });
      }

      const result = await db.select({
        id: dealers.id,
        email: dealers.email,
        passwordHash: dealers.passwordHash,
        businessName: dealers.businessName,
        verified: dealers.verified,
      })
        .from(dealers)
        .where(eq(dealers.email, email.toLowerCase()))
        .limit(1);

      if (result.length === 0) {
        return res.status(401).json({ ok: false, error: "invalid_credentials" });
      }

      const dealer = result[0];
      const valid = await bcrypt.compare(password, dealer.passwordHash || "");
      if (!valid) {
        return res.status(401).json({ ok: false, error: "invalid_credentials" });
      }

      // Update last login
      await db.update(dealers)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(dealers.id, dealer.id));

      req.session!.dealerId = dealer.id;
      req.session!.dealerEmail = dealer.email;

      return res.json({
        ok: true,
        dealer: {
          id: dealer.id,
          email: dealer.email,
          businessName: dealer.businessName,
        }
      });
    } catch (err: any) {
      console.error("dealer_login_error", err);
      return res.status(500).json({ ok: false, error: "login_failed" });
    }
  });

  // ── Get current dealer profile ───────────────────────────────────────────
  app.get("/api/dealer/auth/me", requireDealerAuth, async (req, res) => {
    try {
      const result = await db.select()
        .from(dealers)
        .where(eq(dealers.id, req.session!.dealerId!))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({ ok: false, error: "dealer_not_found" });
      }

      const d = result[0];
      return res.json({
        ok: true,
        dealer: {
          id: d.id,
          email: d.email,
          businessName: d.businessName,
          contactName: d.contactName,
          phone: d.phone,
          fflLicenseNumber: d.fflLicenseNumber,
          fflExpiryDate: d.fflExpiryDate,
          fflOnFile: d.fflOnFile,
          sotOnFile: d.sotOnFile,
          taxFormOnFile: d.taxFormOnFile,
          ein: d.ein,
          einType: d.einType,
          businessAddress: d.businessAddress,
          city: d.city,
          state: d.state,
          zip: d.zip,
          tier: d.tier,
          verified: d.verified,
          sotExpiryDate: d.sotExpiryDate,
          hasDemoUnitShipped: d.hasDemoUnitShipped,
          lastLoginAt: d.lastLoginAt,
          createdAt: d.createdAt,
        }
      });
    } catch (err: any) {
      console.error("dealer_me_error", err);
      return res.status(500).json({ ok: false, error: "fetch_failed" });
    }
  });

  // ── Update dealer profile ────────────────────────────────────────────────
  app.put("/api/dealer/auth/profile", requireDealerAuth, async (req, res) => {
    try {
      const { contactName, phone, ein, einType, businessAddress, city, state, zip } = req.body || {};
      const updates: Record<string, any> = {};
      if (contactName !== undefined) updates.contactName = contactName;
      if (phone !== undefined) updates.phone = phone;
      if (ein !== undefined) updates.ein = ein;
      if (einType !== undefined) updates.einType = einType;
      if (businessAddress !== undefined) updates.businessAddress = businessAddress;
      if (city !== undefined) updates.city = city;
      if (state !== undefined) updates.state = state;
      if (zip !== undefined) updates.zip = zip;
      updates.updatedAt = new Date().toISOString();

      await db.update(dealers)
        .set(updates)
        .where(eq(dealers.id, req.session!.dealerId!));

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("dealer_update_profile_error", err);
      return res.status(500).json({ ok: false, error: "update_failed" });
    }
  });

  // ── Change password ──────────────────────────────────────────────────────
  app.put("/api/dealer/auth/password", requireDealerAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ ok: false, error: "invalid_password" });
      }

      const result = await db.select({ passwordHash: dealers.passwordHash })
        .from(dealers)
        .where(eq(dealers.id, req.session!.dealerId!))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({ ok: false, error: "dealer_not_found" });
      }

      const valid = await bcrypt.compare(currentPassword, result[0].passwordHash || "");
      if (!valid) {
        return res.status(401).json({ ok: false, error: "invalid_current_password" });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await db.update(dealers)
        .set({ passwordHash: newHash })
        .where(eq(dealers.id, req.session!.dealerId!));

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("dealer_change_password_error", err);
      return res.status(500).json({ ok: false, error: "password_change_failed" });
    }
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  app.post("/api/dealer/auth/logout", (req, res) => {
    req.session?.destroy(() => {});
    return res.json({ ok: true });
  });

  // ── Get dealer orders ────────────────────────────────────────────────────
  app.get("/api/dealer/orders", requireDealerAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT s.id, s.type, s.quantity, s.description, s.created_at, s.tracking_number,
                s.shipped_at, s.paid_at, s.ffl_license_number, s.serial_number,
                ds.order_type
         FROM submissions s
         JOIN dealer_submissions ds ON ds.submission_id = s.id
         WHERE ds.dealer_id = $1
         ORDER BY s.created_at DESC
         LIMIT 50`,
        [req.session!.dealerId]
      );

      return res.json({ ok: true, orders: result.rows });
    } catch (err: any) {
      console.error("dealer_orders_error", err);
      return res.status(500).json({ ok: false, error: "fetch_failed" });
    }
  });

  // ── Upload dealer document (FFL, SOT, Tax) ───────────────────────────────
  app.post("/api/dealer/upload-document", requireDealerAuth, async (req, res) => {
    try {
      const { fileName, fileData, documentType } = req.body || {};
      if (!fileName || !fileData || !documentType) {
        return res.status(400).json({ ok: false, error: "missing_fields" });
      }
      if (!["ffl", "sot", "tax"].includes(documentType)) {
        return res.status(400).json({ ok: false, error: "invalid_document_type" });
      }

      const updates: Record<string, any> = {};
      if (documentType === "ffl") {
        updates.fflFileName = fileName;
        updates.fflFileData = fileData;
        updates.fflOnFile = true;
      } else if (documentType === "sot") {
        updates.sotFileName = fileName;
        updates.sotFileData = fileData;
        updates.sotOnFile = true;
      } else if (documentType === "tax") {
        updates.salesTaxFormName = fileName;
        updates.salesTaxFormData = fileData;
        updates.taxFormOnFile = true;
      }
      updates.updatedAt = new Date().toISOString();

      await db.update(dealers)
        .set(updates)
        .where(eq(dealers.id, req.session!.dealerId!));

      return res.json({ ok: true, documentType });
    } catch (err: any) {
      console.error("dealer_upload_document_error", err);
      return res.status(500).json({ ok: false, error: "upload_failed" });
    }
  });
}

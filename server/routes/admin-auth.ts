import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";

declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
    dealerId?: string;
    dealerEmail?: string;
  }
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@dubdub22.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin) {
    return next();
  }
  return res.status(403).json({ ok: false, error: "unauthorized" });
}

export function registerAdminAuthRoutes(app: Express) {
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "missing_credentials" });
      }
      if (!ADMIN_PASSWORD) {
        return res.status(500).json({ ok: false, error: "admin_not_configured" });
      }

      if (email !== ADMIN_EMAIL) {
        return res.status(401).json({ ok: false, error: "invalid_credentials" });
      }

      const valid = password === ADMIN_PASSWORD;
      if (!valid) {
        return res.status(401).json({ ok: false, error: "invalid_credentials" });
      }

      req.session!.isAdmin = true;
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: "login_failed" });
    }
  });

  app.get("/api/admin/check-auth", (req, res) => {
    return res.json({ ok: true, authorized: !!req.session?.isAdmin });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });
}

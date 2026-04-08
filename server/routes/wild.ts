import type { Express } from "express";
import { type Server } from "http";

// YouTube API key — set in .env as YOUTUBE_API_KEY
// If not set, YouTube search will return empty results gracefully
function getYouTubeApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || null;
}

// ── YouTube: Search for videos tagged #dubdub22 ──────────────────────────────
// GET /api/wild/youtube?q=dubdub22
export function registerWildRoutes(app: Express) {

  // ── Public: Submit a photo/video for "In The Wild" ─────────────────────────
  app.post("/api/wild/submit", async (req, res) => {
    try {
      const { submitterName, submitterEmail, submitterPhone, caption, mediaUrl, mediaType, sourcePlatform, sourceUrl } = req.body || {};

      if (!submitterName || !caption) {
        return res.status(400).json({ ok: false, error: "name_and_caption_required" });
      }
      if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
        return res.status(400).json({ ok: false, error: "invalid_email" });
      }
      if (mediaType && !["photo", "video"].includes(mediaType)) {
        return res.status(400).json({ ok: false, error: "invalid_media_type" });
      }

      const { pool } = await import("../db.js");
      const result = await pool.query(
        `INSERT INTO wild_submissions
           (submitter_name, submitter_email, submitter_phone, caption,
            media_url, media_type, source_platform, source_url, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
         RETURNING id`,
        [submitterName, submitterEmail || null, submitterPhone || null, caption,
         mediaUrl || null, mediaType || "photo", sourcePlatform || "submission", sourceUrl || null]
      );

      // Send confirmation to submitter
      if (submitterEmail) {
        const { sendViaGmail } = await import("../routes.js");
        try {
          await sendViaGmail({
            to: submitterEmail,
            from: `DubDub22 <info@dubdub22.com>`,
            subject: `We Received Your Submission — DubDub22 In The Wild`,
            text: [
              `Hi ${submitterName},`,
              ``,
              `Thanks for sharing your DubDub22 content! We've received your submission and our team will review it shortly.`,
              ``,
              `If approved, your photo/video will appear on our "In The Wild" page at dubdub22.com/in-the-wild.`,
              ``,
              `We'll be in touch if we need anything else.`,
              ``,
              `— DubDub22 Team`,
            ].join("\n"),
          });
        } catch (emailErr) {
          console.error("wild_submit_auto_reply_error", emailErr);
        }
      }

      return res.json({ ok: true, id: result.rows[0].id });
    } catch (err: any) {
      console.error("wild_submit_error", err);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // ── Public: Get approved submissions for "In The Wild" gallery ─────────────
  app.get("/api/wild/submissions", async (req, res) => {
    try {
      const { pool } = await import("../db.js");
      const result = await pool.query(
        `SELECT id, submitter_name, caption, media_url, media_type,
                source_platform, source_url, approved_at, created_at
         FROM wild_submissions
         WHERE status = 'approved'
         ORDER BY approved_at DESC`
      );
      return res.json({ ok: true, data: result.rows });
    } catch (err: any) {
      console.error("wild_get_submissions_error", err);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // ── Admin: List all submissions (pending, approved, rejected) ─────────────
  app.get("/api/admin/wild-submissions", async (req: any, res: any) => {
    try {
      if (!req.session?.isAdmin) {
        return res.status(403).json({ ok: false, error: "unauthorized" });
      }
      const { status, search } = req.query;
      const { pool } = await import("../db.js");

      let query = `SELECT * FROM wild_submissions WHERE 1=1`;
      const params: any[] = [];
      let idx = 1;

      if (status && status !== "all") {
        query += ` AND status = $${idx++}`;
        params.push(status);
      }
      if (search) {
        query += ` AND (submitter_name ILIKE $${idx} OR caption ILIKE $${idx} OR submitter_email ILIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
      }
      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, params);
      return res.json({ ok: true, data: result.rows });
    } catch (err: any) {
      console.error("admin_wild_submissions_error", err);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // ── Admin: Approve a submission ────────────────────────────────────────────
  app.post("/api/admin/wild-submissions/:id/approve", async (req: any, res: any) => {
    try {
      if (!req.session?.isAdmin) {
        return res.status(403).json({ ok: false, error: "unauthorized" });
      }
      const { id } = req.params;
      const { pool } = await import("../db.js");
      await pool.query(
        `UPDATE wild_submissions SET status = 'approved', approved_at = NOW() WHERE id = $1`,
        [id]
      );
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("admin_wild_approve_error", err);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // ── Admin: Reject a submission ───────────────────────────────────────────
  app.post("/api/admin/wild-submissions/:id/reject", async (req: any, res: any) => {
    try {
      if (!req.session?.isAdmin) {
        return res.status(403).json({ ok: false, error: "unauthorized" });
      }
      const { id } = req.params;
      const { adminNotes } = req.body || {};
      const { pool } = await import("../db.js");
      await pool.query(
        `UPDATE wild_submissions SET status = 'rejected', admin_notes = $2 WHERE id = $1`,
        [id, adminNotes || null]
      );
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("admin_wild_reject_error", err);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // ── Admin: Delete a submission ────────────────────────────────────────────
  app.delete("/api/admin/wild-submissions/:id", async (req: any, res: any) => {
    try {
      if (!req.session?.isAdmin) {
        return res.status(403).json({ ok: false, error: "unauthorized" });
      }
      const { id } = req.params;
      const { pool } = await import("../db.js");
      await pool.query(`DELETE FROM wild_submissions WHERE id = $1`, [id]);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("admin_wild_delete_error", err);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });

  // ── YouTube: Search for videos with #dubdub22 ─────────────────────────────
  app.get("/api/wild/youtube", async (req, res) => {
    try {
      const apiKey = getYouTubeApiKey();
      const { q = "dubdub22", maxResults = 12 } = req.query;

      if (!apiKey) {
        // No API key — return empty gracefully (Tom hasn't set it up yet)
        return res.json({ ok: true, videos: [], message: "YouTube API not configured yet" });
      }

      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("key", apiKey);
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("q", String(q));
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("maxResults", String(maxResults));
      searchUrl.searchParams.set("order", "date"); // Most recent first

      const resp = await fetch(searchUrl.toString());
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("youtube_api_error", resp.status, errText);
        return res.status(502).json({ ok: false, error: "youtube_api_error", detail: errText });
      }

      const data: any = await resp.json();

      const videos = (data.items || []).map((item: any) => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        description: item.snippet?.description,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        channelTitle: item.snippet?.channelTitle,
        publishedAt: item.snippet?.publishedAt,
        youtubeUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      }));

      return res.json({ ok: true, videos });
    } catch (err: any) {
      console.error("youtube_search_error", err);
      return res.status(500).json({ ok: false, error: "server_error" });
    }
  });
}

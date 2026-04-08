import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Instagram, Facebook, Youtube, Twitter, Send, CheckCircle, X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useQuery } from "@tanstack/react-query";

// ── Types ──────────────────────────────────────────────────────────────────
interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  youtubeUrl: string;
}

interface WildSubmission {
  id: number;
  submitter_name: string;
  caption: string;
  media_url: string | null;
  media_type: string | null;
  source_platform: string;
  source_url: string | null;
  approved_at: string;
}

// ── YouTube API ────────────────────────────────────────────────────────────
async function fetchYouTubeVideos(): Promise<YouTubeVideo[]> {
  const res = await fetch("/api/wild/youtube");
  const data = await res.json();
  return data.videos || [];
}

async function fetchApprovedSubmissions(): Promise<WildSubmission[]> {
  const res = await fetch("/api/wild/submissions");
  const data = await res.json();
  return data.data || [];
}

// ── Submission Form Modal ──────────────────────────────────────────────────
function SubmitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !caption.trim()) {
      setError("Name and caption are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/wild/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: name.trim(),
          submitterEmail: email.trim(),
          submitterPhone: phone.trim(),
          caption: caption.trim(),
          mediaUrl: mediaUrl.trim(),
          mediaType: "photo",
          sourcePlatform: "submission",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Submission failed");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setName(""); setEmail(""); setPhone(""); setCaption(""); setMediaUrl("");
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Share Your Setup</DialogTitle>
          <DialogDescription>
            Post a photo or video of your DubDub22 in action and get featured on our "In The Wild" page!
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8 text-center"
            >
              <CheckCircle className="w-16 h-16 text-green-500" />
              <h3 className="font-display text-xl font-bold">Submitted!</h3>
              <p className="text-muted-foreground">
                Thanks! We'll review your submission and add it to the gallery if it looks good.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-1 block">Your Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Caption / Description *</label>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Tell us about your setup! What rifle, what ammo, how's it run?"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Photo or Video URL</label>
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://photos.google.com/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can also email photos directly to info@dubdub22.com with "In The Wild" in the subject.
                </p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
              </DialogFooter>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ── YouTube Video Card ──────────────────────────────────────────────────────
function YouTubeCard({ video }: { video: YouTubeVideo }) {
  const [playing, setPlaying] = useState(false);

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black">
          {playing ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={video.title}
            />
          ) : (
            <>
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-white ml-1">
                    <path fill="currentColor" d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
              <Badge className="absolute top-2 right-2 bg-red-600 text-white text-xs">
                <Youtube className="w-3 h-3 mr-1" />
                YouTube
              </Badge>
            </>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium text-sm line-clamp-2 mb-1">{video.title}</h3>
          <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
          <a
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Watch on YouTube
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Customer Submission Gallery Card ───────────────────────────────────────
function SubmissionCard({ sub }: { sub: WildSubmission }) {
  const platformColors: Record<string, string> = {
    submission: "bg-primary",
    youtube: "bg-red-600",
    instagram: "bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600",
    tiktok: "bg-pink-600",
    twitter: "bg-blue-400",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {sub.media_url ? (
          <div className="relative aspect-square bg-muted">
            <img
              src={sub.media_url}
              alt={sub.caption}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-muted flex items-center justify-center">
            <Instagram className="w-10 h-10 text-muted-foreground/50" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">{sub.submitter_name}</span>
            <Badge className={`text-white text-xs ${platformColors[sub.source_platform] || "bg-primary"}`}>
              {sub.source_platform}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">{sub.caption}</p>
          {sub.source_url && (
            <a
              href={sub.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View Original
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Social Link Card ─────────────────────────────────────────────────────────
function SocialCard({ platform, Icon, handle, href, color, gradient }: {
  platform: string;
  Icon: React.ElementType;
  handle: string;
  href: string;
  color: string;
  gradient?: string;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className={`h-2 ${gradient || color}`} />
        <div className="p-6 flex flex-col items-center text-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${platform === "instagram" ? "bg-gradient-to-br from-yellow-100 to-pink-100" : "bg-muted"}`}>
            <Icon className={`w-7 h-7 ${platform === "instagram" ? "text-pink-500" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-display font-bold text-lg capitalize">{platform}</p>
            <p className="text-sm text-muted-foreground">{handle}</p>
          </div>
          <Button
            variant="outline"
            className="w-full cursor-pointer border-border hover:border-primary hover:text-primary"
            onClick={() => window.open(href, "_blank")}
          >
            Follow Us
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function InTheWildPage() {
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data: youtubeVideos = [], isLoading: youtubeLoading } = useQuery({
    queryKey: ["wild-youtube"],
    queryFn: fetchYouTubeVideos,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 min
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["wild-submissions"],
    queryFn: fetchApprovedSubmissions,
    refetchInterval: 2 * 60 * 1000,
  });

  const hasContent = youtubeVideos.length > 0 || submissions.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 py-24 px-6">
        <div className="container mx-auto max-w-6xl">

          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Check Us Out in the Wild!
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              Real shooters, real setups. Tag your photos with{" "}
              <strong className="text-primary">#dubdub22</strong> to be featured here.
            </p>
            <Button
              size="lg"
              className="cursor-pointer"
              onClick={() => setSubmitOpen(true)}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Your Photo
            </Button>
          </motion.div>

          {/* ── Social Links ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            <SocialCard
              platform="youtube"
              Icon={Youtube}
              handle="@DubDub22"
              href="https://youtube.com/@DubDub22"
              color="bg-red-600"
            />
            <SocialCard
              platform="instagram"
              Icon={Instagram}
              handle="@dubdub22"
              href="https://instagram.com/dubdub22"
              color="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600"
              gradient="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600"
            />
            <SocialCard
              platform="twitter"
              Icon={Twitter}
              handle="@DubDub22"
              href="https://twitter.com/DubDub22"
              color="bg-blue-400"
            />
            <SocialCard
              platform="tiktok"
              Icon={({ ...props }) => (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" {...props}>
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.84a4.85 4.85 0 01-1-.15z" />
                </svg>
              )}
              handle="@dubdub22"
              href="https://tiktok.com/@dubdub22"
              color="bg-pink-600"
            />
          </motion.div>

          {/* ── YouTube Videos ── */}
          {youtubeVideos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-16"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                  <Youtube className="w-5 h-5 text-white" />
                </div>
                <h2 className="font-display text-2xl font-bold">Latest Videos</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {youtubeVideos.map((video) => (
                  <YouTubeCard key={video.videoId} video={video} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Customer Submissions ── */}
          {submissions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-16"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-primary-foreground" />
                </div>
                <h2 className="font-display text-2xl font-bold">From the Community</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {submissions.map((sub) => (
                  <SubmissionCard key={sub.id} sub={sub} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Empty State ── */}
          {!hasContent && !youtubeLoading && !submissionsLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <Card className="border-dashed border-2 border-border max-w-xl mx-auto">
                <CardContent className="py-16 px-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Instagram className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-2">
                    Be the First!
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    We're just getting started. Post a photo with <strong>#dubdub22</strong> on your favorite platform, or submit directly below!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      className="border-primary/50 cursor-pointer"
                      onClick={() => setSubmitOpen(true)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Your Photo
                    </Button>
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => window.open("https://youtube.com", "_blank")}
                    >
                      <Youtube className="w-4 h-4 mr-2" />
                      Follow on YouTube
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-6">
                    Want to be featured? Post with <strong>#dubdub22</strong> on any platform — or send your photo directly to info@dubdub22.com
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── CTA Banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-primary text-primary-foreground border-0">
              <CardContent className="py-10 px-8 text-center">
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
                  Got a DubDub22? Show it off.
                </h2>
                <p className="text-primary-foreground/80 max-w-lg mx-auto mb-6">
                  Whether it's at the range, in the field, or on a hunt — we want to see your setup. The best submissions get featured front and center.
                </p>
                <Button
                  size="lg"
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setSubmitOpen(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Your Photo or Video
                </Button>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </main>

      <SiteFooter />

      <SubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}

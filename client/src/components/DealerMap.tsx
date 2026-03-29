import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, X, Loader2 } from "lucide-react";

// Custom colored marker icons for dealer tiers
// Preferred = gold, Normal = dark/black
const goldIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="
    width: 25px;
    height: 41px;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #8B6914;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    margin-left: -3px;
    margin-top: -38px;
  "></div>
  <div style="
    width: 10px;
    height: 10px;
    background: #FFD700;
    border: 2px solid #8B6914;
    border-radius: 50%;
    margin-left: 4px;
    margin-top: -34px;
    position: absolute;
  "></div>`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41],
});

const blackIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div style="
    width: 25px;
    height: 41px;
    background: linear-gradient(135deg, #333 0%, #111 100%);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #000;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    margin-left: -3px;
    margin-top: -38px;
  "></div>
  <div style="
    width: 10px;
    height: 10px;
    background: #333;
    border: 2px solid #000;
    border-radius: 50%;
    margin-left: 4px;
    margin-top: -34px;
    position: absolute;
  "></div>`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41],
});

// Fallback to default marker if needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Dealer {
  id: string;
  business_name: string;
  city: string;
  state: string;
  zip: string;
  tier: string;
  verified: boolean;
}

// Geocode a zip code to lat/lng using a free API
async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const lat = parseFloat(data.places[0].latitude);
    const lng = parseFloat(data.places[0].longitude);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Approximate center of continental US
const DEFAULT_CENTER: [number, number] = [39.5, -98.35];

function FitBoundsOnLoad({ dealers }: { dealers: Dealer[] }) {
  const map = useMap();
  useEffect(() => {
    if (dealers.length === 0) return;
    const coords = dealers
      .map(d => d._latlng as [number, number] | undefined)
      .filter(Boolean) as [number, number][];
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 10);
    } else {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [dealers, map]);
  return null;
}

export default function DealerMap() {
  const { toast } = useToast();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Zip search state
  const [searchZip, setSearchZip] = useState("");
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchingZip, setSearchingZip] = useState(false);

  // Form state
  const [form, setForm] = useState({ contactName: "", email: "", phone: "", message: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadDealers() {
      try {
        const resp = await fetch("/api/dealers/map");
        const data = await resp.json();
        if (!data.ok) throw new Error("Failed to load dealers");
        setDealers(data.data || []);
      } catch {
        toast({ title: "Could not load dealer map", variant: "destructive" });
        setDealers([]);
      } finally {
        setLoading(false);
      }
    }
    loadDealers();
  }, [toast]);

  // Geocode all dealers that don't have coordinates yet
  useEffect(() => {
    async function geocode() {
      const updated = await Promise.all(
        dealers.map(async (dealer) => {
          if ((dealer as any)._latlng) return dealer;
          const coords = await geocodeZip(dealer.zip);
          return { ...dealer, _latlng: coords };
        })
      );
      setDealers(updated);
    }
    if (dealers.length > 0 && !(dealers[0] as any)._latlng) {
      geocode();
    }
  }, [dealers]);

  // Sort dealers: Preferred first, then by proximity to searched zip
  const sortedDealers = React.useMemo(() => {
    const withDist = dealers.map(d => {
      const ll = (d as any)._latlng;
      let dist = Infinity;
      if (searchCoords && ll) {
        // Haversine-ish approximation for miles
        const R = 3958.8;
        const dLat = (ll.lat - searchCoords.lat) * Math.PI / 180;
        const dLng = (ll.lng - searchCoords.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(ll.lat * Math.PI/180) * Math.cos(searchCoords.lat * Math.PI/180) * Math.sin(dLng/2)**2;
        dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }
      return { ...d, _dist: dist };
    });

    return withDist.sort((a, b) => {
      // Preferred first
      if (a.tier === "Preferred" && b.tier !== "Preferred") return -1;
      if (a.tier !== "Preferred" && b.tier === "Preferred") return 1;
      // Then by distance (only if zip searched)
      if (searchCoords) {
        return a._dist - b._dist;
      }
      // Default: alpha by state then city
      if (a.state !== b.state) return a.state.localeCompare(b.state);
      return a.city.localeCompare(b.city);
    });
  }, [dealers, searchCoords]);

  async function handleZipSearch(e: React.FormEvent) {
    e.preventDefault();
    const zip = searchZip.trim().replace(/[^0-9]/g, "");
    if (zip.length !== 5) {
      toast({ title: "Enter a valid 5-digit zip code", variant: "destructive" });
      return;
    }
    setSearchingZip(true);
    const coords = await geocodeZip(zip);
    if (!coords) {
      toast({ title: "Could not find that zip code", variant: "destructive" });
      setSearchCoords(null);
    } else {
      setSearchCoords(coords);
      toast({ title: `Showing dealers near ${zip}`, duration: 2000 });
    }
    setSearchingZip(false);
  }

  function clearZipSearch() {
    setSearchZip("");
    setSearchCoords(null);
  }

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!form.contactName.trim()) errors.contactName = "Name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm() || !selectedDealer) return;
    setSubmitting(true);
    try {
      const resp = await fetch("/api/retail-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerId: selectedDealer.id,
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || "Submission failed");

      toast({
        title: "Inquiry Sent!",
        description: `We'll be in touch about ${selectedDealer.business_name} shortly.`,
        className: "bg-orange-500 text-black border-orange-600",
      });
      setShowForm(false);
      setForm({ contactName: "", email: "", phone: "", message: "" });
      setSelectedDealer(null);
    } catch {
      toast({ title: "Send Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function openForm(dealer: Dealer) {
    setSelectedDealer(dealer);
    setShowForm(true);
  }

  // Filter dealers with coordinates
  const mappableDealers = sortedDealers.filter(d => (d as any)._latlng);

  return (
    <>
      {/* Dealer Map Section */}
      <section className="py-16 bg-card/30" id="dealer-map">
        <div className="container mx-auto px-6">
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold mb-3">FIND A DEALER</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-4">
              Click a pin to see dealer info and send an inquiry directly to our team.
            </p>
            {/* Zip search */}
            <form onSubmit={handleZipSearch} className="flex justify-center gap-2 max-w-sm mx-auto">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="Enter your zip"
                value={searchZip}
                onChange={e => setSearchZip(e.target.value.replace(/[^0-9]/g, "").slice(0,5))}
                className="w-36 text-center bg-card border-border"
              />
              <Button
                type="submit"
                variant="default"
                disabled={searchingZip}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-display cursor-pointer px-6"
              >
                {searchingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
              {searchCoords && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearZipSearch}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </form>
            {searchCoords && (
              <p className="text-xs text-muted-foreground mt-2">
                Sorted by distance from {searchZip}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-border shadow-xl" style={{ height: "500px" }}>
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={4}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mappableDealers.map(dealer => (
                  <Marker
                    key={dealer.id}
                    // @ts-expect-error custom property
                    position={dealer._latlng}
                    icon={dealer.tier === "Preferred" ? goldIcon : blackIcon}
                    eventHandlers={{
                      click: () => openForm(dealer),
                    }}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <p className="font-bold text-sm">{dealer.business_name}</p>
                        <p className="text-xs text-gray-600">{dealer.city}, {dealer.state} {dealer.zip}</p>
                        {dealer.tier && (
                          <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {dealer.tier}
                          </span>
                        )}
                        <button
                          onClick={() => openForm(dealer)}
                          className="mt-2 w-full bg-primary text-white text-xs font-bold py-1.5 px-3 rounded hover:bg-primary/90 transition-colors"
                        >
                          I'm Interested
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                <FitBoundsOnLoad dealers={mappableDealers} />
              </MapContainer>
            </div>
          )}

          {!loading && sortedDealers.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No dealers found.
            </p>
          )}

          {!loading && mappableDealers.length === 0 && sortedDealers.length > 0 && (
            <p className="text-center text-muted-foreground py-12">
              No dealer locations available yet. Check back soon.
            </p>
          )}
        </div>
      </section>

      {/* Inquiry Modal */}
      {showForm && selectedDealer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border-border">
            <CardHeader className="relative pb-2">
              <button
                onClick={() => { setShowForm(false); setSelectedDealer(null); }}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Inquiry — {selectedDealer.business_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedDealer.city}, {selectedDealer.state}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="text-sm font-medium">Your Name *</label>
                  <Input
                    value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="John Smith"
                    className="mt-1 bg-card border-border focus:border-primary"
                  />
                  {formErrors.contactName && <p className="text-xs text-red-500 mt-1">{formErrors.contactName}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@example.com"
                    className="mt-1 bg-card border-border focus:border-primary"
                  />
                  {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium">Phone <span className="text-muted-foreground">(optional)</span></label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="mt-1 bg-card border-border focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message <span className="text-muted-foreground">(optional)</span></label>
                  <Textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us about your interest or any questions..."
                    rows={3}
                    className="mt-1 bg-card border-border focus:border-primary resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display cursor-pointer"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : "SEND INQUIRY"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

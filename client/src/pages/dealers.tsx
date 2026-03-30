import React from "react";
import { motion } from "framer-motion";
import DealerMap from "@/components/DealerMap";
import SiteHeader from "@/components/SiteHeader";

export default function DealersPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      {/* Hero */}
      <section className="pt-24 pb-12 bg-grid-pattern relative overflow-hidden">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            FIND A DEALER
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Locate a DubDub22 dealer near you. Use the map below to find dealers in your area.
          </motion.p>
        </div>
      </section>

      {/* Dealer Map */}
      <section className="py-12 bg-card/20">
        <div className="container mx-auto px-6">
          <DealerMap />
        </div>
      </section>
    </div>
  );
}

import React from "react";
import { motion } from "framer-motion";
import DealerMap from "@/components/DealerMap";
import DealerForm from "@/components/DealerForm";

export default function DealersPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      {/* Hero */}
      <section className="py-24 bg-grid-pattern relative overflow-hidden">
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

      {/* Dealer Inquiry */}
      <motion.section
        id="contact"
        className="py-24 bg-card/30 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-20"></div>
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div className="space-y-6 text-center md:text-left flex flex-col justify-center">
              <h2 className="text-4xl font-bold drop-shadow-sm">DEALER FORM</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Interested in carrying DubDub22 suppressors? Fill out the form and we&apos;ll be in touch.
              </p>
            </motion.div>
            <motion.div>
              <div className="border-border bg-background/50 backdrop-blur-md p-6 shadow-2xl">
                <DealerForm />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

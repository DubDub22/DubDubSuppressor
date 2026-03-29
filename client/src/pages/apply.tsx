import React from "react";
import { motion } from "framer-motion";
import DealerForm from "@/components/DealerForm";

export default function ApplyPage() {
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
            BECOME A DEALER
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Interested in carrying DubDub22 suppressors? Fill out the form and we&apos;ll be in touch.
          </motion.p>
        </div>
      </section>

      {/* Dealer Inquiry Form */}
      <motion.section
        className="py-24 bg-card/30 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-20"></div>
        <div className="container mx-auto px-6 max-w-2xl">
          <motion.div>
            <div className="border-border bg-background/50 backdrop-blur-md p-6 shadow-2xl">
              <DealerForm />
            </div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}

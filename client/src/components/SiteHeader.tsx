import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";

const MotionWrapButton = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`inline-block ${className}`}>
    {children}
  </motion.div>
);

interface SiteHeaderProps {
  variant?: "home" | "standard";
}

export default function SiteHeader({ variant = "standard" }: SiteHeaderProps) {
  const { scrollY } = useScroll();
  const navShadow = useTransform(scrollY, [0, 50], ["none", "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ boxShadow: navShadow }}
      className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/5"
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="font-display font-bold text-2xl tracking-wider text-primary drop-shadow-sm cursor-pointer" onClick={() => window.location.href = '/'}>
          DUBDUB22
        </div>
        {variant === "home" && (
          <div className="hidden md:flex gap-8 font-sans text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollToSection('features')} className="group relative hover:text-primary transition-colors py-1">
              FEATURES
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button onClick={() => scrollToSection('specs')} className="group relative hover:text-primary transition-colors py-1">
              SPECS
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button onClick={() => scrollToSection('gallery')} className="group relative hover:text-primary transition-colors py-1">
              GALLERY
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
            </button>
          </div>
        )}
        <div className="hidden sm:flex gap-3">
          <MotionWrapButton>
            <Button
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground font-display uppercase tracking-wide cursor-pointer"
              onClick={() => window.location.href = '/dealers'}
            >
              Find a Dealer
            </Button>
          </MotionWrapButton>
          <MotionWrapButton>
            <Button
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground font-display uppercase tracking-wide cursor-pointer"
              onClick={() => window.location.href = '/apply'}
            >
              Become a Dealer
            </Button>
          </MotionWrapButton>
          <MotionWrapButton>
            <Button
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground font-display uppercase tracking-wide cursor-pointer"
              onClick={() => window.location.href = '/warranty'}
            >
              Warranty Service
            </Button>
          </MotionWrapButton>
          <MotionWrapButton>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-display uppercase tracking-wide cursor-pointer shadow-lg"
              onClick={() => window.location.href = '/order'}
            >
              Order
            </Button>
          </MotionWrapButton>
        </div>
      </div>
    </motion.nav>
  );
}

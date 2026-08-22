"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#platform", label: "Platform" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#security", label: "Security" },
  { href: "#about", label: "About" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled
            ? "border-b border-white/[0.06] bg-[#030508]/85 backdrop-blur-xl"
            : "bg-transparent"
        )}
      >
        <nav
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:h-[4.5rem] lg:px-8"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.2em] text-white transition-colors hover:text-accent sm:text-sm"
          >
            AI CAMPUS GUARDIAN
          </Link>

          <ul className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="gradient-border inline-flex items-center rounded-full bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.08] hover:shadow-[0_0_30px_rgba(56,189,248,0.15)]"
            >
              Access Platform
            </Link>
          </div>

          <button
            type="button"
            className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <span
              className={cn(
                "h-0.5 w-5 bg-white transition-all duration-300",
                mobileOpen && "translate-y-2 rotate-45"
              )}
            />
            <span
              className={cn(
                "h-0.5 w-5 bg-white transition-all duration-300",
                mobileOpen && "opacity-0"
              )}
            />
            <span
              className={cn(
                "h-0.5 w-5 bg-white transition-all duration-300",
                mobileOpen && "-translate-y-2 -rotate-45"
              )}
            />
          </button>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={{ opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? "auto" : "none" }}
        className="fixed inset-0 z-40 bg-[#030508]/95 backdrop-blur-xl md:hidden"
      >
        <div className="flex h-full flex-col items-center justify-center gap-8 pt-16">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              initial={{ opacity: 0, y: 16 }}
              animate={mobileOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setMobileOpen(false)}
              className="text-lg text-white/90"
            >
              {link.label}
            </motion.a>
          ))}
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="gradient-border mt-4 rounded-full bg-white/[0.06] px-8 py-3 text-sm font-medium text-white"
          >
            Access Platform
          </Link>
        </div>
      </motion.div>
    </>
  );
}

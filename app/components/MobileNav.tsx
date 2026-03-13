"use client";

import { useState } from "react";

export default function MobileNav() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                className={`hamburger ${open ? "is-open" : ""}`}
                onClick={() => setOpen(!open)}
                aria-label="Toggle menu"
                aria-expanded={open}
            >
                <span />
                <span />
                <span />
            </button>

            {/* Overlay */}
            <div
                className={`mobile-overlay ${open ? "visible" : ""}`}
                onClick={() => setOpen(false)}
            />

            {/* Slide-out drawer */}
            <nav className={`mobile-drawer ${open ? "is-open" : ""}`}>
                <a href="#problem" onClick={() => setOpen(false)}>
                    The Problem
                </a>
                <a href="#how-it-works" onClick={() => setOpen(false)}>
                    How It Works
                </a>
                <a href="#blogs" onClick={() => setOpen(false)}>
                    Blogs
                </a>
                <a className="btn-cta mobile-cta" href="#cta" onClick={() => setOpen(false)}>
                    Get Started →
                </a>
            </nav>
        </>
    );
}

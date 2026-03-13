"use client";

import { motion } from "framer-motion";

interface AnimatedSectionProps {
    children: React.ReactNode;
    className?: string;
    id?: string;
    delay?: number;
}

export function FadeIn({ children, className, id, delay = 0 }: AnimatedSectionProps) {
    return (
        <motion.div
            id={id}
            className={className}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
        >
            {children}
        </motion.div>
    );
}

export function StaggerContainer({ children, className, id }: AnimatedSectionProps) {
    return (
        <motion.div
            id={id}
            className={className}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: 0.15,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

export function FadeInStaggerItem({ children, className, style, delay = 0 }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; delay?: number; }) {
    return (
        <motion.div
            className={className}
            style={style}
            variants={{
                hidden: { opacity: 0, y: 30 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

export function RevealLine({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ overflow: "hidden" }}>
            <motion.div
                variants={{
                    hidden: { y: "100%" },
                    visible: {
                        y: 0,
                        transition: { duration: 1, ease: [0.16, 1, 0.3, 1] },
                    },
                }}
            >
                {children}
            </motion.div>
        </div>
    );
}

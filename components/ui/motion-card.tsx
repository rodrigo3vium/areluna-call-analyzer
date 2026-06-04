"use client";

import * as React from "react";
import { motion } from "framer-motion";

type Props = {
  children: React.ReactNode;
  hover?: boolean;
  delay?: number;
  className?: string;
};

export function MotionCard({ children, hover = false, delay = 0, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      whileHover={hover ? { y: -2 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
}

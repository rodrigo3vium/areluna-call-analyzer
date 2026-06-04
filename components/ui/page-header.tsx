import * as React from "react";

import { cn } from "@/lib/utils";
import { OrnamentalDivider } from "@/components/ui/ornamental-divider";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ornament?: boolean;
  right?: React.ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, subtitle, ornament, right, className }: Props) {
  return (
    <header className={cn("mb-10 flex items-end justify-between gap-6", className)}>
      <div className="space-y-3">
        {eyebrow && <p className="eyebrow text-gold-500">{eyebrow}</p>}
        <h1 className="display-section text-foreground">{title}</h1>
        {subtitle && <p className="text-[15px] text-primary-600">{subtitle}</p>}
        {ornament && <OrnamentalDivider variant="left" className="pt-1" />}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

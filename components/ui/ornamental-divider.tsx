import { cn } from "@/lib/utils";

type Props = {
  variant?: "left" | "center";
  className?: string;
};

export function OrnamentalDivider({ variant = "center", className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        variant === "center" ? "justify-center" : "justify-start",
        className,
      )}
      aria-hidden
    >
      {variant === "center" && <span className="h-px w-16 bg-gold-500/60" />}
      <span className="h-1.5 w-1.5 rotate-45 bg-gold-500" />
      <span className="h-px w-16 bg-gold-500/60" />
    </div>
  );
}

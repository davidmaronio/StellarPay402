"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Step {
  title: string;
  description?: string;
  badge?: string;          // optional small badge text e.g. "Recommended"
  badgeTone?: "default" | "primary" | "emerald" | "amber";
  children?: ReactNode;    // arbitrary content (e.g. a CodeBlock)
}

interface StepsProps {
  steps: Step[];
  className?: string;
}

const badgeToneMap: Record<NonNullable<Step["badgeTone"]>, string> = {
  default: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/30",
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  amber:   "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

export function Steps({ steps, className }: StepsProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Vertical track */}
      <div className="absolute left-4 top-2 bottom-2 w-px bg-border" aria-hidden />

      <ol className="flex flex-col gap-8 relative">
        {steps.map((step, i) => {
          const tone = step.badgeTone ?? "default";
          return (
            <li key={i} className="relative pl-14">
              {/* Numbered circle */}
              <div className="absolute left-0 top-0 flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border text-sm font-semibold text-foreground shadow-lg shadow-primary/10">
                <span className="absolute inset-0 rounded-full bg-linear-to-br from-primary/20 to-transparent" />
                <span className="relative">{i + 1}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground tracking-tight">
                      {step.title}
                    </h3>
                    {step.description && (
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                  {step.badge && (
                    <span
                      className={cn(
                        "shrink-0 text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full border",
                        badgeToneMap[tone]
                      )}
                    >
                      {step.badge}
                    </span>
                  )}
                </div>

                {step.children}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

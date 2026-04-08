"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  filename?: string;
  language?: string;
  highlightLines?: number[];
  className?: string;
}

export function CodeBlock({
  code,
  filename,
  language = "shell",
  highlightLines = [],
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted overflow-hidden shadow-lg shadow-primary/5",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          {filename && (
            <span className="text-xs font-mono text-muted-foreground truncate">
              {filename}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {language && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono hidden sm:block">
              {language}
            </span>
          )}
          <button
            type="button"
            onClick={copy}
            aria-label="Copy code"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-accent border border-border rounded-md px-2.5 py-1 transition-colors"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto">
        <pre className="text-xs leading-relaxed text-foreground/90 font-mono py-4">
          <code className="block">
            {lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "px-4 whitespace-pre",
                  highlightLines.includes(i + 1) &&
                    "bg-primary/10 border-l-2 border-primary"
                )}
              >
                {line || "\u00A0"}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

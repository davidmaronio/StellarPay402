"use client";
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";
import { cn } from "@/lib/utils";

const links = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "How it works", href: "/#how-it-works", anchor: "how-it-works" },
] as { label: string; href: string; anchor?: string }[];

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.location.href = `/#${id}`;
  }
}

export function MarketingHeader() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 mx-auto w-full max-w-5xl border-b border-transparent md:rounded-2xl md:border md:transition-all md:ease-out",
        {
          "bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border backdrop-blur-lg md:top-4 md:max-w-4xl md:shadow-lg md:shadow-primary/5":
            scrolled && !open,
          "bg-background/90": open,
        },
      )}
    >
      <nav
        className={cn(
          "flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
          { "md:px-3": scrolled },
        )}
      >
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <Image src="/icon.png" alt="StellarPay402" width={28} height={28} className="rounded-lg shadow-lg shadow-primary/20" />
          <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
            StellarPay402
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={link.anchor ? (e) => { e.preventDefault(); scrollToAnchor(link.anchor!); } : undefined}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3"
          >
            Sign in
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={() => setOpen(!open)}
          className="md:hidden h-9 w-9"
          aria-label="Toggle menu"
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>

      <div
        className={cn(
          "fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y border-border bg-background/95 backdrop-blur-lg md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <div
          data-slot={open ? "open" : "closed"}
          className={cn(
            "data-[slot=open]:animate-in data-[slot=open]:zoom-in-95 data-[slot=closed]:animate-out data-[slot=closed]:zoom-out-95 ease-out",
            "flex h-full w-full flex-col justify-between gap-y-2 p-4",
          )}
        >
          <div className="grid gap-y-2">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={link.anchor
                  ? (e) => { e.preventDefault(); setOpen(false); scrollToAnchor(link.anchor!); }
                  : () => setOpen(false)}
                className={buttonVariants({
                  variant: "ghost",
                  className: "justify-start",
                })}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className={buttonVariants({ className: "w-full" })}
            >
              Get started
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" onClick={() => setOpen(false)} className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

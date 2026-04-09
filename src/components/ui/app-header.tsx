"use client";
import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Marketplace", href: "/marketplace" },
];

export function AppHeader() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);
  const router = useRouter();
  const { data: session } = useSession();

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Cast for the additional fields better-auth carries (slug, stellarAddress)
  const user = session?.user as
    | { name?: string | null; slug?: string | null }
    | undefined;
  const initial = (user?.name ?? "?").charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 mx-auto w-full max-w-6xl border-b border-transparent md:rounded-2xl md:border md:transition-all md:ease-out",
        {
          "bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border backdrop-blur-lg md:top-4 md:max-w-5xl md:shadow-lg md:shadow-primary/5":
            scrolled && !open,
          "bg-background/90": open,
        },
      )}
    >
      <nav
        className={cn(
          "flex h-16 w-full items-center justify-between gap-4 px-4 md:h-14 md:transition-all md:ease-out",
          { "md:px-3": scrolled },
        )}
      >
        {/* Left: brand + nav */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <Image src="/icon.png" alt="StellarPay402" width={32} height={32} className="rounded-xl shadow-lg shadow-primary/20" />
            <span className="font-semibold text-foreground text-sm hidden sm:block group-hover:text-primary transition-colors">
              StellarPay402
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1 ml-2">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: slug pill, new endpoint CTA, user menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user?.slug && (
            <div className="hidden lg:flex items-center gap-1.5 bg-secondary border border-border rounded-full px-3 py-1 text-xs font-mono text-secondary-foreground">
              <span className="text-muted-foreground">slug:</span>
              <span className="text-primary">{user.slug}</span>
            </div>
          )}

          <Link
            href="/dashboard/endpoints/new"
            className={cn(
              buttonVariants({ size: "sm" }),
              "hidden sm:inline-flex gap-1.5 shadow-lg shadow-primary/20",
            )}
          >
            <Plus size={14} />
            New endpoint
          </Link>

          <div className="hidden sm:flex items-center gap-2 bg-card border border-border rounded-full pl-1 pr-2 py-1">
            <div className="w-6 h-6 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              {initial}
            </div>
            <span className="text-xs text-foreground hidden md:block max-w-[100px] truncate">
              {user?.name}
            </span>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              <LogOut size={12} />
            </button>
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
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed top-16 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y border-border bg-background/95 backdrop-blur-lg md:hidden",
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
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className={buttonVariants({
                  variant: "ghost",
                  className: "justify-start",
                })}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard/endpoints/new"
              onClick={() => setOpen(false)}
              className={buttonVariants({
                variant: "ghost",
                className: "justify-start",
              })}
            >
              <Plus size={14} className="mr-2" />
              New endpoint
            </Link>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {user?.slug && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono">slug</span>
                <span className="font-mono text-primary">{user.slug}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-2">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-xs font-bold text-primary-foreground">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{user?.name}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                <LogOut size={12} /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import { signUp, signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";

function GitHubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

type Step = "details" | "success";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ghLoading, setGhLoading] = useState(false);
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);

  async function handleGitHub() {
    setGhLoading(true);
    await signIn.social({ provider: "github", callbackURL: "/dashboard" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signUp.email({ name, email, password });
    if (res.error) {
      setError(res.error.message ?? "Registration failed");
      setLoading(false);
      return;
    }
    // Trigger reverse reveal animation, then advance to success
    setReverseCanvasVisible(true);
    setTimeout(() => setInitialCanvasVisible(false), 50);
    setTimeout(() => setStep("success"), 1800);
    setTimeout(() => router.push("/dashboard"), 3000);
  }

  // Re-run the intro animation if the reverse one finishes (defensive)
  useEffect(() => {
    if (step === "details") {
      setReverseCanvasVisible(false);
      setInitialCanvasVisible(true);
    }
  }, [step]);

  return (
    <div className="flex w-full flex-col min-h-screen bg-background relative">
      {/* Canvas backdrop */}
      <div className="absolute inset-0 z-0">
        {initialCanvasVisible && (
          <div className="absolute inset-0">
            <CanvasRevealEffect
              animationSpeed={3}
              containerClassName="bg-background"
              colors={[
                [164, 143, 255], // primary
                [228, 222, 255],
              ]}
              dotSize={6}
              reverse={false}
            />
          </div>
        )}
        {reverseCanvasVisible && (
          <div className="absolute inset-0">
            <CanvasRevealEffect
              animationSpeed={4}
              containerClassName="bg-background"
              colors={[
                [164, 143, 255],
                [228, 222, 255],
              ]}
              dotSize={6}
              reverse={true}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,15,26,1)_0%,transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-linear-to-b from-background to-transparent" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Mini top nav */}
        <header className="flex items-center justify-between px-6 sm:px-10 h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-bold text-xs text-primary-foreground">
              S
            </div>
            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              StellarPay402
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </header>

        {/* Centered form */}
        <div className="flex flex-1 items-center justify-center px-5 pb-20">
          <div className="w-full max-w-sm">
            <AnimatePresence mode="wait">
              {step === "details" ? (
                <motion.div
                  key="details-step"
                  initial={{ opacity: 0, x: -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-1">
                    <h1 className="text-[2.25rem] font-bold leading-[1.1] tracking-tight text-foreground">
                      Welcome Developer
                    </h1>
                    <p className="text-base text-muted-foreground font-light">
                      Create your StellarPay402 account
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGitHub}
                      disabled={ghLoading}
                      className="backdrop-blur-[2px] w-full flex items-center justify-center gap-2 bg-card/40 hover:bg-card/70 disabled:opacity-50 text-foreground border border-border rounded-full py-3 px-4 transition-colors"
                    >
                      <GitHubIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {ghLoading ? "Redirecting…" : "Continue with GitHub"}
                      </span>
                    </button>

                    <div className="flex items-center gap-4">
                      <div className="h-px bg-border flex-1" />
                      <span className="text-muted-foreground text-xs">or</span>
                      <div className="h-px bg-border flex-1" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full backdrop-blur-[1px] bg-card/40 text-foreground border border-border rounded-full py-3 px-5 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-center placeholder:text-muted-foreground/60 transition-all"
                        placeholder="Your name"
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full backdrop-blur-[1px] bg-card/40 text-foreground border border-border rounded-full py-3 px-5 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-center placeholder:text-muted-foreground/60 transition-all"
                        placeholder="you@example.com"
                      />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full backdrop-blur-[1px] bg-card/40 text-foreground border border-border rounded-full py-3 px-5 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-center placeholder:text-muted-foreground/60 transition-all"
                        placeholder="Password (8+ characters)"
                      />

                      {error && (
                        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-2">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 text-sm transition-colors mt-2"
                      >
                        {loading ? "Creating account…" : "Create account"}
                      </button>
                    </form>
                  </div>

                  <p className="text-xs text-muted-foreground/80 pt-6">
                    By signing up, you agree to our{" "}
                    <Link href="#" className="underline hover:text-foreground transition-colors">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="underline hover:text-foreground transition-colors">
                      Privacy Notice
                    </Link>
                    .
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success-step"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                  className="space-y-6 text-center"
                >
                  <div className="space-y-1">
                    <h1 className="text-[2.25rem] font-bold leading-[1.1] tracking-tight text-foreground">
                      You&apos;re in!
                    </h1>
                    <p className="text-base text-muted-foreground font-light">
                      Welcome aboard
                    </p>
                  </div>

                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="py-8"
                  >
                    <div className="mx-auto w-16 h-16 rounded-full bg-linear-to-br from-primary to-primary/70 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-primary-foreground"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </motion.div>

                  <p className="text-sm text-muted-foreground">
                    Taking you to your dashboard…
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {step === "details" && (
              <p className="text-center text-xs text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline transition-colors">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

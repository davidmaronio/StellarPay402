"use client";

import { useState } from "react";
import { Star, ExternalLink } from "lucide-react";

interface Props {
  userSlug: string;
  slug: string;
}

export function AttestForm({ userSlug, slug }: Props) {
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [comment, setComment]     = useState("");
  const [payer, setPayer]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState<{ txHash: string | null } | null>(null);
  const [error, setError]         = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Pick a star rating first"); return; }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/marketplace/${userSlug}/${slug}/attest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment, payerAddress: payer || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    setDone(data);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="text-2xl mb-2">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</div>
        <p className="text-sm font-medium text-foreground mb-1">Attestation recorded</p>
        {done.txHash ? (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${done.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
          >
            {done.txHash.slice(0, 10)}… on Stellar Expert
            <ExternalLink size={10} />
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">Saved off-chain (registry not configured)</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Leave an attestation</p>
        <p className="text-xs text-muted-foreground mb-4">
          Rate this endpoint. If the Soroban registry is configured, your score is anchored on chain.
        </p>

        {/* Star picker */}
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="text-2xl transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                size={28}
                className={
                  n <= (hovered || rating)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/40"
                }
                strokeWidth={1.5}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground self-center">
              {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
            </span>
          )}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment (stored on chain if registry is live)"
          rows={2}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
        />

        <input
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
          placeholder="Your Stellar address (optional, for attribution)"
          className="mt-3 w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {error && (
        <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !rating}
        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold text-sm py-2.5 rounded-xl transition-colors"
      >
        {loading ? "Submitting…" : "Submit attestation"}
      </button>
    </form>
  );
}

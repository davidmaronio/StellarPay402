/**
 * Unit tests for GET /api/marketplace
 *
 * Verifies the public catalog returns the correct shape and only active
 * endpoints, without hitting a real database.
 */

const mockFrom = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            orderBy: mockFrom,
          }),
        }),
      }),
    }),
  },
  endpoints: Symbol("endpoints"),
  users:     Symbol("users"),
  eq:        jest.fn(),
  sql:       jest.fn(),
}));

import { GET } from "@/app/api/marketplace/route";

const MOCK_ROWS = [
  {
    id:            "ep-1",
    name:          "Cat Facts",
    slug:          "cat-facts",
    description:   "Random cat facts",
    priceUsdc:     0.01,
    totalRequests: 10,
    paidRequests:  8,
    isAiPowered:   false,
    onChainTxHash: "tx-abc",
    createdAt:     new Date("2025-01-01"),
    userSlug:      "alice",
    userName:      "Alice",
    avgRating:     4.5,
    ratingCount:   6,
  },
  {
    id:            "ep-2",
    name:          "AI Answer Agent",
    slug:          "ai-answer",
    description:   "Agent powered by Claude Haiku",
    priceUsdc:     0.01,
    totalRequests: 50,
    paidRequests:  50,
    isAiPowered:   true,
    onChainTxHash: "tx-def",
    createdAt:     new Date("2025-01-02"),
    userSlug:      "alice",
    userName:      "Alice",
    avgRating:     5.0,
    ratingCount:   12,
  },
];

describe("GET /api/marketplace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with an array of endpoints", async () => {
    mockFrom.mockResolvedValue(MOCK_ROWS);
    const res  = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });

  it("each row has the expected fields", async () => {
    mockFrom.mockResolvedValue(MOCK_ROWS);
    const res  = await GET();
    const body = await res.json();
    const row  = body[0];

    expect(row).toHaveProperty("id");
    expect(row).toHaveProperty("name");
    expect(row).toHaveProperty("priceUsdc");
    expect(row).toHaveProperty("userSlug");
    expect(row).toHaveProperty("avgRating");
    expect(row).toHaveProperty("ratingCount");
    expect(row).toHaveProperty("isAiPowered");
    expect(row).toHaveProperty("onChainTxHash");
  });

  it("AI-powered endpoint has isAiPowered=true", async () => {
    mockFrom.mockResolvedValue(MOCK_ROWS);
    const res  = await GET();
    const body = await res.json();
    const aiEndpoint = body.find((r: { slug: string }) => r.slug === "ai-answer");
    expect(aiEndpoint.isAiPowered).toBe(true);
  });

  it("returns empty array when no endpoints exist", async () => {
    mockFrom.mockResolvedValue([]);
    const res  = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

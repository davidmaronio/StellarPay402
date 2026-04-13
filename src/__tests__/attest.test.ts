/**
 * Unit tests for POST /api/marketplace/[userSlug]/[slug]/attest
 *
 * All external I/O (DB, Soroban registry) is mocked so these tests run
 * without a real database or Stellar node.
 */

// --- mocks (must be declared before imports) ---

const mockSelect   = jest.fn();
const mockInsert   = jest.fn();
const mockAttest   = jest.fn();

jest.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelect }) }) }),
    insert: () => ({ values: mockInsert }),
  },
  users:        Symbol("users"),
  endpoints:    Symbol("endpoints"),
  attestations: Symbol("attestations"),
}));

jest.mock("@/lib/registry", () => ({
  attestEndpointOnChain: mockAttest,
}));

// Next.js route handler imports
import { POST } from "@/app/api/marketplace/[userSlug]/[slug]/attest/route";
import { NextRequest } from "next/server";

// Helpers ----------------------------------------------------------------

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/marketplace/alice/weather/attest", {
    method: "POST",
    body:   JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockParams = Promise.resolve({ userSlug: "alice", slug: "weather" });

const MOCK_USER     = { id: "user-1", slug: "alice", name: "Alice" };
const MOCK_ENDPOINT = { id: "ep-uuid-1234", slug: "weather", userId: "user-1" };

// ------------------------------------------------------------------------

describe("POST /api/marketplace/:userSlug/:slug/attest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue([]);
    mockAttest.mockResolvedValue("txhash-abc");
  });

  it("returns 400 when rating is missing", async () => {
    const res = await POST(makeRequest({}), { params: mockParams });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/rating/i);
  });

  it("returns 400 when rating is out of range (0)", async () => {
    const res = await POST(makeRequest({ rating: 0 }), { params: mockParams });
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating is out of range (6)", async () => {
    const res = await POST(makeRequest({ rating: 6 }), { params: mockParams });
    expect(res.status).toBe(400);
  });

  it("returns 404 when user slug does not exist", async () => {
    mockSelect.mockResolvedValueOnce([]); // user not found
    const res = await POST(makeRequest({ rating: 5 }), { params: mockParams });
    expect(res.status).toBe(404);
  });

  it("returns 404 when endpoint slug does not exist", async () => {
    mockSelect
      .mockResolvedValueOnce([MOCK_USER])  // user found
      .mockResolvedValueOnce([]);           // endpoint not found
    const res = await POST(makeRequest({ rating: 4 }), { params: mockParams });
    expect(res.status).toBe(404);
  });

  it("saves attestation and returns ok:true with txHash on success", async () => {
    mockSelect
      .mockResolvedValueOnce([MOCK_USER])
      .mockResolvedValueOnce([MOCK_ENDPOINT]);

    const res  = await POST(
      makeRequest({ rating: 5, comment: "Great API!", payerAddress: "GPAYER..." }),
      { params: mockParams },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.txHash).toBe("txhash-abc");

    // DB insert was called
    expect(mockInsert).toHaveBeenCalledTimes(1);
    // On-chain attest was called with correct args
    expect(mockAttest).toHaveBeenCalledWith(
      expect.objectContaining({ endpointId: MOCK_ENDPOINT.id, rating: 5 }),
    );
  });

  it("still returns ok:true when on-chain attest fails (best-effort)", async () => {
    mockSelect
      .mockResolvedValueOnce([MOCK_USER])
      .mockResolvedValueOnce([MOCK_ENDPOINT]);
    mockAttest.mockResolvedValue(null); // registry call failed

    const res  = await POST(makeRequest({ rating: 3 }), { params: mockParams });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.txHash).toBeNull();
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

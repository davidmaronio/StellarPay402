import { pgTable, text, timestamp, boolean, real, integer, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:               text("id").primaryKey(),
  name:             text("name").notNull(),
  email:            text("email").notNull().unique(),
  emailVerified:    boolean("email_verified").notNull().default(false),
  image:            text("image"),
  slug:             text("slug").notNull().unique(), // e.g. "alice" → proxy URL /alice/...
  stellarAddress:   text("stellar_address"),         // default payout address
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id:           text("id").primaryKey(),
  expiresAt:    timestamp("expires_at").notNull(),
  token:        text("token").notNull().unique(),
  ipAddress:    text("ip_address"),
  userAgent:    text("user_agent"),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id:                   text("id").primaryKey(),
  accountId:            text("account_id").notNull(),
  providerId:           text("provider_id").notNull(),
  userId:               text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken:          text("access_token"),
  refreshToken:         text("refresh_token"),
  idToken:              text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt:timestamp("refresh_token_expires_at"),
  scope:                text("scope"),
  password:             text("password"),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
  updatedAt:            timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

export const endpoints = pgTable("endpoints", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:           text("name").notNull(),
  slug:           text("slug").notNull(),           // e.g. "weather" → /alice/weather
  targetUrl:      text("target_url").notNull(),     // the real API URL
  priceUsdc:      real("price_usdc").notNull(),     // price per request in USDC
  stellarAddress: text("stellar_address").notNull(),// payout Stellar address
  active:         boolean("active").notNull().default(true),
  description:    text("description"),
  totalRequests:  integer("total_requests").notNull().default(0),
  paidRequests:   integer("paid_requests").notNull().default(0),
  totalEarned:    real("total_earned").notNull().default(0),
  // On-chain anchor on the Soroban EndpointRegistry contract.
  // Null means the endpoint has not been (or failed to be) anchored.
  onChainTxHash:  text("on_chain_tx_hash"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id:           uuid("id").primaryKey().defaultRandom(),
  endpointId:   uuid("endpoint_id").notNull().references(() => endpoints.id, { onDelete: "cascade" }),
  payerAddress: text("payer_address"),
  amountUsdc:   real("amount_usdc").notNull(),
  txHash:       text("tx_hash"),
  network:      text("network").notNull().default("stellar:testnet"),
  settledAt:    timestamp("settled_at").notNull().defaultNow(),
});

export const requestLogs = pgTable("request_logs", {
  id:             uuid("id").primaryKey().defaultRandom(),
  endpointId:     uuid("endpoint_id").notNull().references(() => endpoints.id, { onDelete: "cascade" }),
  paymentId:      uuid("payment_id").references(() => payments.id),
  status:         text("status").notNull(),         // "paid" | "unpaid" | "error"
  responseStatus: integer("response_status"),
  latencyMs:      integer("latency_ms"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

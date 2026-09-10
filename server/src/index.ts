import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import express from "express";
import cors from "cors";
import planRouter from "./plan.router";
import shopifyRouter from "./shopify.router";
import promotionRouter from "./promotion.router";

const app = express();

/**
 * The mobile app is not a browser and sends no Origin header, so it is
 * unaffected by CORS. Reflecting every origin (`origin: true`) only widened the
 * blast radius for the browser-based promotion dashboard. Allow-list instead.
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // native app / server-to-server
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed`));
    },
    credentials: false,
  })
);

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/plan", planRouter);
app.use("/api/shopify", shopifyRouter);
app.use("/api/promotions", promotionRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Final error handler: log the detail, return a generic message.
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server] unhandled error:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  }
);

/** Fail fast at boot rather than 500ing on the first real request. */
const REQUIRED_ENV = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_ADMIN_ACCESS_TOKEN",
  "SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  "OPENAI_API_KEY",
];

const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`[server] Missing required environment variables: ${missing.join(", ")}`);
  if (process.env.NODE_ENV === "production") process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log(`API on :${port}`));

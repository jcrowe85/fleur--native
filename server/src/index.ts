import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import express from "express";
import cors from "cors";
import planRouter from "./plan.router";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  console.log("health check");
  res.json({ status: "ok", uptime: process.uptime(), ts: new Date().toISOString() })
});

app.use("/api/plan", planRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log(`API on :${port}`));

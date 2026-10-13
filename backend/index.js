import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import db from "./db/db.config.js";
import ensureSchema from "./db/ensure-schema.js";
import mainRouter from "./src/api/main.routes.js";
import { errorHandler } from "./src/middleware/error-handler.js";
import { IMAGES_DIR } from "./src/api/images/images.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || process.env.port || 3130);
const isProduction = process.env.NODE_ENV === "production";

const app = express();

// Trust proxy when deployed behind Render, Railway, or nginx.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ==========================================
// SECURITY HEADERS
// ==========================================

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });

  if (isProduction) {
    res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  next();
});

// ==========================================
// CORS CONFIGURATION
// Supports frontend ports 5173 and 5176.
// CLIENT_URL can contain multiple comma-separated origins.
// ==========================================

const allowedOrigins = (
  process.env.CLIENT_URL ||
  "http://localhost:5173,http://localhost:5176,http://127.0.0.1:5176"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

console.log("Allowed frontend origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as curl.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  }),
);

// Parse JSON request bodies.
app.use(express.json({ limit: "1mb" }));

// ==========================================
// FILES + HEALTH CHECK
// ==========================================

app.use(
  "/uploads/images",
  express.static(IMAGES_DIR, {
    maxAge: "7d",
    immutable: true,
  }),
);

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({ status: "database unavailable" });
  }
});

// ==========================================
// API ROUTES
// ==========================================

app.use("/api", mainRouter);

// Return JSON for unknown API routes.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// FRONTEND SERVING
// ==========================================

const FRONTEND_DIST = path.resolve(
  __dirname,
  process.env.FRONTEND_DIST || "../frontend/dist",
);

if (fs.existsSync(path.join(FRONTEND_DIST, "index.html"))) {
  console.log(`Serving frontend from ${FRONTEND_DIST}`);

  app.use(
    express.static(FRONTEND_DIST, {
      index: false,
      maxAge: "1h",
    }),
  );

  // Send other GET requests to the React application.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/uploads")) {
      return next();
    }

    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("GPT Clone Backend is running!");
  });
}

// ==========================================
// GLOBAL 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use(errorHandler);

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    await db.query("SELECT 1");
    console.log("MySQL connection verified.");

    await ensureSchema();
    console.log("Database schema verified.");

    app.listen(PORT, () => {
      console.log("=================================");
      console.log(`Server running on port ${PORT}`);
      console.log(`Mode: ${isProduction ? "production" : "development"}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log("=================================");
    });
  } catch (error) {
    console.error("Startup failed:");
    console.error(error);
    process.exit(1);
  }
}

startServer();

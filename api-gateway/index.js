import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

import authRouter from "./routes/auth.routes.js";
import invoiceRouter from "./routes/enterprise.routes.js";
import smeRoutes from "./routes/invoice.routes.js";
import investorRouter from "./routes/investor.routes.js";
import balanceRouter from "./routes/balances.routes.js";
import { initBlockchain } from "./services/blockchain.service.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;
/* ============================= */
/*  CORS CONFIGURATION (STABLE)  */
/* ============================= */

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

/* ============================= */
/*       MIDDLEWARE              */
/* ============================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ============================= */
/*     BLOCKCHAIN INITIALIZE     */
/* ============================= */

try {
  initBlockchain();
  console.log("✅ Blockchain initialized");
} catch (error) {
  console.error("❌ Blockchain initialization failed:", error);
}

/* ============================= */
/*          ROUTES               */
/* ============================= */

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/enterprise", invoiceRouter);
app.use("/api/v1/invoices", smeRoutes);
app.use("/api/v1/investor", investorRouter);
app.use("/api/balances", balanceRouter);
/* ============================= */
/*        HEALTH CHECK           */
/* ============================= */

app.get("/", (req, res) => {
  res.json({
    message: "Vaultiq API is running 🚀",
  });
});

/* ============================= */
/*        START SERVER           */
/* ============================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
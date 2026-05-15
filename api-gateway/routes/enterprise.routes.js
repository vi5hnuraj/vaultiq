import { Router } from "express";
import { upload } from "../middleware/upload.middleware.js";
import { mintInvoice, parseInvoice } from "../controllers/invoice.controller.js";

const router = Router();

// POST /api/v1/enterprise/mint
router.post("/mint", upload.single("file"), mintInvoice);

// POST /api/v1/enterprise/parse
router.post("/parse", upload.single("file"), parseInvoice);

export default router;
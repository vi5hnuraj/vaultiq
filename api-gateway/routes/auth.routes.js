import { Router } from "express";
import { login, getNonce } from "../controllers/auth.controller.js";

const router = Router();

router.get("/nonce", getNonce);
router.post("/enterprise", login);
router.post("/investor", login);

export default router;
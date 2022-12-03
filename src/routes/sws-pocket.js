import express from "express";
import { body } from "express-validator";
import { getSchedule, pocketSignUp, validatePocket } from "../controllers/sws-pocket-controller.js";
import { pocketAuthChecker } from "../middleware/sws-pocket-auth-checker.js";

const router = express.Router();

router.post("/signup", body("visitorid").notEmpty(), body("otp_code").isLength(10), pocketSignUp);

// activate auth checker middleware
router.use(pocketAuthChecker());

router.get("/validate-me", validatePocket);

router.get("/schedule", getSchedule);

export default router;

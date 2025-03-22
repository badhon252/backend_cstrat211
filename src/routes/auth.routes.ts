import express from "express";
import { register, login, forgotPassword, verifyOtp, resetPassword, logout } from "../controllers/auth.controller";

const router = express.Router();

router.post("/register", register as express.RequestHandler);
router.post("/login", login as express.RequestHandler);
router.post("/forgot-password", forgotPassword as express.RequestHandler);
router.post("/verify-otp", verifyOtp as express.RequestHandler);
router.post("/reset-password", resetPassword as express.RequestHandler);
router.post("/logout", logout as express.RequestHandler);


export default router;

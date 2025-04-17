import express from "express";
import {
  register,
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  logout,
  updateUserProfile,
  uploadAvatar,
  getAllUsers,
  getUserById,
  setNewPassword,
} from "../controllers/auth.controller";
import { isLoggedIn } from "../middlewares/isLoggedIn";
import upload from "../utils/multer";

const router = express.Router();

router.post("/register", register as express.RequestHandler);
router.post("/login", login as express.RequestHandler);
router.post("/set-new-password/:userId", setNewPassword as express.RequestHandler);
router.post("/forgot-password", forgotPassword as express.RequestHandler);
router.post("/verify-otp", verifyOtp as express.RequestHandler);
router.post("/reset-password", resetPassword as express.RequestHandler);
router.put("/profile", isLoggedIn, updateUserProfile as express.RequestHandler);

router.post(
  "/update-avatar",
  isLoggedIn,
  upload.single("avatar"),
  uploadAvatar as express.RequestHandler
);
router.get("/users", getAllUsers as express.RequestHandler);
router.get("/users/:id", getUserById as express.RequestHandler);

router.post("/logout", logout as express.RequestHandler);


export default router;

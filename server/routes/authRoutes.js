const express = require("express");
const router = express.Router();

const {
  requestRegistrationOtp,
  verifyRegistrationOtp,
  login,
  profile,
  updateProfile,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// New OTP-based registration endpoints.
router.post("/register/request-otp", requestRegistrationOtp);
router.post("/register/verify-otp", verifyRegistrationOtp);
// Direct registration is intentionally not exposed: all new registrations must use the OTP flow.
router.post("/login", login);
router.get("/profile", authMiddleware, profile);
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const EmailOtp = require("../models/EmailOtp");

function createToken(userId) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username || user.name,
    email: user.email,
    interests: user.interests || [],
    bio: user.bio || "",
    location: user.location || "",
    profilePhoto: user.profilePhoto || "",
    isProfilePublic: user.isProfilePublic ?? false,
    privateGoals: user.privateGoals || [],
    yearlyReflection: user.yearlyReflection || "",
    createdAt: user.createdAt,
  };
}

function normalizeRegistration(body) {
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!/^[a-z0-9_.]{4,30}$/.test(username)) {
    return { error: "Username must be 4–30 characters using letters, numbers, underscores, or dots." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters long." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };
  return { username, email, password };
}

function createMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    const error = new Error("Email verification is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to server/.env.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendOtpEmail(email, otp) {
  const transporter = createMailer();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your MindSpace verification code",
    text: `Your MindSpace verification code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Verify your MindSpace email</h2><p>Your verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p></div>`,
  });
}

async function validateNewAccount(username, email) {
  const existingEmail = await User.findOne({ email }).select("_id");
  if (existingEmail) return "Email is already registered. Please log in instead.";
  const existingUsername = await User.findOne({ username }).select("_id");
  if (existingUsername) return "Username is already taken. Choose another one.";
  return null;
}

exports.requestRegistrationOtp = async (req, res) => {
  try {
    const registration = normalizeRegistration(req.body || {});
    if (registration.error) return res.status(400).json({ message: registration.error });

    const duplicateMessage = await validateNewAccount(registration.username, registration.email);
    if (duplicateMessage) return res.status(409).json({ message: duplicateMessage });

    const existingOtp = await EmailOtp.findOne({ email: registration.email }).select("createdAt");
    if (existingOtp && Date.now() - existingOtp.createdAt.getTime() < 60_000) {
      return res.status(429).json({ message: "Please wait 60 seconds before requesting another code." });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const now = new Date();
    await EmailOtp.findOneAndUpdate(
      { email: registration.email },
      { $set: { otpHash, createdAt: now, expiresAt: new Date(now.getTime() + 10 * 60_000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      await sendOtpEmail(registration.email, otp);
    } catch (mailError) {
      await EmailOtp.deleteOne({ email: registration.email });
      console.error("Registration OTP email failed:", mailError.message);
      if (mailError.code === "SMTP_NOT_CONFIGURED") {
        return res.status(503).json({ message: mailError.message });
      }
      return res.status(502).json({ message: "Could not send the verification email. Check SMTP settings and try again." });
    }

    return res.json({ message: "Verification code sent. Check your email; the code expires in 10 minutes." });
  } catch (error) {
    console.error("Request registration OTP failed:", error.message);
    return res.status(500).json({ message: "Could not start email verification." });
  }
};

exports.verifyRegistrationOtp = async (req, res) => {
  try {
    const registration = normalizeRegistration(req.body || {});
    if (registration.error) return res.status(400).json({ message: registration.error });
    const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: "Enter the six-digit verification code." });

    const otpRecord = await EmailOtp.findOne({ email: registration.email }).select("+otpHash");
    if (!otpRecord || otpRecord.expiresAt.getTime() <= Date.now()) {
      if (otpRecord) await EmailOtp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "Verification code is invalid or expired. Request a new code." });
    }
    const submittedHash = crypto.createHash("sha256").update(otp).digest("hex");
    const valid = submittedHash.length === otpRecord.otpHash.length && crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(otpRecord.otpHash));
    if (!valid) return res.status(400).json({ message: "Incorrect verification code." });

    const duplicateMessage = await validateNewAccount(registration.username, registration.email);
    if (duplicateMessage) {
      await EmailOtp.deleteOne({ _id: otpRecord._id });
      return res.status(409).json({ message: duplicateMessage });
    }

    const hashedPassword = await bcrypt.hash(registration.password, 12);
    const user = await User.create({
      name: registration.username,
      username: registration.username,
      email: registration.email,
      password: hashedPassword,
    });
    await EmailOtp.deleteOne({ _id: otpRecord._id });
    return res.status(201).json({
      message: "Email verified and registration successful",
      token: createToken(user._id),
      user: safeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That email or username is already registered." });
    console.error("Verify registration OTP failed:", error.message);
    return res.status(500).json({ message: "Could not verify email and create the account." });
  }
};

// Legacy direct-registration endpoint retained for existing API clients.
// The updated Register.jsx uses the OTP endpoints above.
exports.register = async (req, res) => {
  try {
    const body = req.body || {};
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : (typeof body.name === "string" ? body.name.trim().toLowerCase() : "");
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9_.]{4,30}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({ message: "Enter a username of at least 4 characters, a valid email, and a password of at least 8 characters." });
    }
    const duplicateMessage = await validateNewAccount(username, email);
    if (duplicateMessage) return res.status(409).json({ message: duplicateMessage });
    const user = await User.create({ name: username, username, email, password: await bcrypt.hash(password, 12) });
    return res.status(201).json({ message: "Registration successful", token: createToken(user._id), user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Email or username is already registered." });
    console.error("Legacy registration failed:", error.message);
    return res.status(500).json({ message: "Registration failed." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password) return res.status(400).json({ message: "Email and password are required" });
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    return res.json({ message: "Login successful", token: createToken(user._id), user: safeUser(user) });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({ message: "Login failed" });
  }
};

exports.profile = async (req, res) => res.json({ user: safeUser(req.user) });

exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, location, profilePhoto, interests, isProfilePublic, privateGoals, yearlyReflection } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Name cannot be empty" });
      updates.name = name.trim().slice(0, 80);
    }
    if (bio !== undefined) {
      if (typeof bio !== "string") return res.status(400).json({ message: "Invalid bio" });
      updates.bio = bio.trim().slice(0, 500);
    }
    if (location !== undefined) {
      if (typeof location !== "string") return res.status(400).json({ message: "Invalid location" });
      updates.location = location.trim().slice(0, 120);
    }
    if (profilePhoto !== undefined) {
      if (typeof profilePhoto !== "string") return res.status(400).json({ message: "Invalid profile photo URL" });
      updates.profilePhoto = profilePhoto.trim().slice(0, 2000);
    }
    if (interests !== undefined) {
      if (!Array.isArray(interests) || interests.some((item) => typeof item !== "string")) return res.status(400).json({ message: "Interests must be a list of text values" });
      updates.interests = [...new Set(interests.map((item) => item.trim()).filter(Boolean))].slice(0, 20);
    }
    if (isProfilePublic !== undefined) {
      if (typeof isProfilePublic !== "boolean") return res.status(400).json({ message: "Profile visibility must be true or false" });
      updates.isProfilePublic = isProfilePublic;
    }
    if (privateGoals !== undefined) {
      if (!Array.isArray(privateGoals) || privateGoals.some((item) => typeof item !== "string")) return res.status(400).json({ message: "Private goals must be a list of text values" });
      updates.privateGoals = privateGoals.map((item) => item.trim()).filter(Boolean).slice(0, 20);
    }
    if (yearlyReflection !== undefined) {
      if (typeof yearlyReflection !== "string") return res.status(400).json({ message: "Invalid yearly reflection" });
      updates.yearlyReflection = yearlyReflection.slice(0, 3000);
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "Profile updated successfully", user: safeUser(user) });
  } catch (error) {
    console.error("Update profile failed:", error.message);
    return res.status(500).json({ message: "Unable to update profile" });
  }
};

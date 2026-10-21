
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

function createToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
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

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Enter a name, valid email and password of at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Registration successful",
      token: createToken(user._id),
      user: safeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    return res.json({
      message: "Login successful",
      token: createToken(user._id),
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
    });
  }
};

exports.profile = async (req, res) => {
  return res.json({ user: safeUser(req.user) });
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      bio,
      location,
      profilePhoto,
      interests,
      isProfilePublic,
      privateGoals,
      yearlyReflection,
    } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }
      updates.name = name.trim().slice(0, 80);
    }

    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return res.status(400).json({ message: "Invalid bio" });
      }
      updates.bio = bio.trim().slice(0, 500);
    }

    if (location !== undefined) {
      if (typeof location !== "string") {
        return res.status(400).json({ message: "Invalid location" });
      }
      updates.location = location.trim().slice(0, 120);
    }

    if (profilePhoto !== undefined) {
      if (typeof profilePhoto !== "string") {
        return res.status(400).json({
          message: "Invalid profile photo URL",
        });
      }
      updates.profilePhoto = profilePhoto.trim().slice(0, 2000);
    }

    if (interests !== undefined) {
      if (
        !Array.isArray(interests) ||
        interests.some((item) => typeof item !== "string")
      ) {
        return res.status(400).json({
          message: "Interests must be a list of text values",
        });
      }

      updates.interests = [
        ...new Set(
          interests.map((item) => item.trim()).filter(Boolean)
        ),
      ].slice(0, 20);
    }

    if (isProfilePublic !== undefined) {
      if (typeof isProfilePublic !== "boolean") {
        return res.status(400).json({
          message: "Profile visibility must be true or false",
        });
      }
      updates.isProfilePublic = isProfilePublic;
    }

    if (privateGoals !== undefined) {
      if (
        !Array.isArray(privateGoals) ||
        privateGoals.some((item) => typeof item !== "string")
      ) {
        return res.status(400).json({
          message: "Private goals must be a list of text values",
        });
      }

      updates.privateGoals = privateGoals
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20);
    }

    if (yearlyReflection !== undefined) {
      if (typeof yearlyReflection !== "string") {
        return res.status(400).json({
          message: "Invalid yearly reflection",
        });
      }
      updates.yearlyReflection = yearlyReflection.slice(0, 3000);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update profile",
    });
  }
};

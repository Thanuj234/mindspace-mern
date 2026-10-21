require("dotenv").config();
const blogRoutes = require("./routes/blogRoutes");
const journalRoutes = require("./routes/journalRoutes");
const express = require("express");
const cors = require("cors");
const collaborationRoutes = require("./routes/collaborationRoutes");
const cloudinary = require("./config/cloudinary");
const supabase = require("./config/supabase");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const app = express();
app.get("/api/storage-test", async (req, res) => {
  try {
    const cloudinaryReady = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    const supabaseReady = Boolean(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (!cloudinaryReady || !supabaseReady) {
      return res.status(500).json({
        message: "Storage configuration is incomplete",
        cloudinaryReady,
        supabaseReady,
      });
    }

    const { error } = await supabase.storage.listBuckets();

    if (error) throw error;

    res.json({
      message: "Storage configuration looks good!",
      cloudinaryReady,
      supabaseReady,
    });
  } catch (error) {
    console.error("Storage test failed:", error.message);
    res.status(500).json({
      message: "Storage connection failed. Check server logs.",
    });
  }
});
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "MindSpace API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/collaborations", collaborationRoutes);
app.use("/api/ai", aiRoutes);
// Member 3's routes will be mounted here after integration.
const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`MindSpace server running on port ${PORT}`);
  });
}

startServer();
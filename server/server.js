
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "MindSpace API is running" });
});

app.use("/api/auth", authRoutes);

// Member 3's routes will be mounted here after integration.

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`MindSpace server running on port ${PORT}`);
  });
}

startServer();
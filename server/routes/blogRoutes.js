const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getPublishedBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  getMyBlogs
} = require("../controllers/blogController");

// Public endpoints
router.get("/feed", getPublishedBlogs);

// Private endpoints
router.use(authMiddleware);
router.get("/mine", getMyBlogs);
router.post("/", createBlog);
router.put("/:id", updateBlog);
router.delete("/:id", deleteBlog);

module.exports = router;
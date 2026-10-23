const express = require("express");
const multer = require("multer");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getPublishedBlogs,
  getFollowingBlogs,
  getPublishedBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getMyBlogs,
  getStorySocialStatus,
  toggleStoryLike,
  addStoryComment,
  deleteStoryComment,
} = require("../controllers/blogController");
const { uploadBlogMedia } = require("../controllers/blogMediaController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      ["video/mp4", "video/webm", "video/quicktime"].includes(file.mimetype);
    cb(allowed ? null : new Error("Only images and MP4, WebM, or MOV videos are supported."), allowed);
  },
});

// Public endpoints
router.get("/feed", getPublishedBlogs);
// Following feed is private and must authenticate before reading the user graph.
router.get("/following-feed", authMiddleware, getFollowingBlogs);
// Authenticated story interactions. These routes are declared before the generic feed/:id route.
router.get("/:id/social", authMiddleware, getStorySocialStatus);
router.post("/:id/like", authMiddleware, toggleStoryLike);
router.post("/:id/comments", authMiddleware, addStoryComment);
router.delete("/:id/comments/:commentId", authMiddleware, deleteStoryComment);
router.get("/feed/:id", getPublishedBlogById);

// Private endpoints
router.use(authMiddleware);
router.get("/mine", getMyBlogs);
router.post("/media/upload", upload.single("file"), uploadBlogMedia);
router.post("/", createBlog);
router.put("/:id", updateBlog);
router.delete("/:id", deleteBlog);

module.exports = router;

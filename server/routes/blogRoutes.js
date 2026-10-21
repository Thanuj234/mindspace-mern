const express = require("express");
const multer = require("multer");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getPublishedBlogs,
  getPublishedBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getMyBlogs,
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
router.get("/feed/:id", getPublishedBlogById);

// Private endpoints
router.use(authMiddleware);
router.get("/mine", getMyBlogs);
router.post("/media/upload", upload.single("file"), uploadBlogMedia);
router.post("/", createBlog);
router.put("/:id", updateBlog);
router.delete("/:id", deleteBlog);

module.exports = router;

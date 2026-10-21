
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  improveWriting,
  generateBlogDraft,
  askMemory,
} = require("../controllers/aiController");

router.use(authMiddleware);

router.post("/improve-writing", improveWriting);
router.post("/draft-blog", generateBlogDraft);
router.post("/ask-memory", askMemory);

module.exports = router;

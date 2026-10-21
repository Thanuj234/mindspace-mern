const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getJournals,
  createJournal,
  updateJournal,
  deleteJournal
} = require("../controllers/journalController");

const multer = require("multer");

const {
  uploadJournalImage,
  uploadJournalAttachment,
} = require("../controllers/journalUploadController");

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const {
  getJournalImageUrl,
  getJournalAttachmentUrl,
} = require("../controllers/journalFileAccessController");

router.use(authMiddleware);

router.get(
  "/:id/images/:imageId/url",
  getJournalImageUrl
);

router.get(
  "/:id/attachments/:attachmentId/url",
  getJournalAttachmentUrl
);

router.post("/:id/images", imageUpload.single("image"), uploadJournalImage);

router.post(
  "/:id/attachments",
  documentUpload.single("file"),
  uploadJournalAttachment
);

router.get("/", getJournals);
router.post("/", createJournal);
router.put("/:id", updateJournal);
router.delete("/:id", deleteJournal);

module.exports = router;
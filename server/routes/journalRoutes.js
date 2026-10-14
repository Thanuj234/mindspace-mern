const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getJournals,
  createJournal,
  updateJournal,
  deleteJournal
} = require("../controllers/journalController");

router.use(authMiddleware);

router.get("/", getJournals);
router.post("/", createJournal);
router.put("/:id", updateJournal);
router.delete("/:id", deleteJournal);

module.exports = router;
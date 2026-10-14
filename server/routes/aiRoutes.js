const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { improveWriting } = require("../controllers/aiController");

router.use(authMiddleware);
router.post("/improve-writing", improveWriting);

module.exports = router;
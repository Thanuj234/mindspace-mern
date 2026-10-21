const Journal = require("../models/Journal");

exports.getJournals = async (req, res) => {
  try {
    const journals = await Journal.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(journals);
  } catch (error) {
    console.error("Could not load journals:", error);
    res.status(500).json({ message: "Could not load journals" });
  }
};

exports.createJournal = async (req, res) => {
  try {
    const { title, content, mood, tags, isFavorite } = req.body;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ message: "Title and content are required" });
    if (title.trim().length > 150) return res.status(400).json({ message: "Title must be 150 characters or fewer." });
    if (content.length > 20000) return res.status(400).json({ message: "Journal content must be 20,000 characters or fewer." });
    const journal = await Journal.create({
      userId: req.user._id, title: title.trim(), content, mood: mood || "neutral",
      tags: Array.isArray(tags) ? tags : [], isFavorite: typeof isFavorite === "boolean" ? isFavorite : false,
    });
    res.status(201).json(journal);
  } catch (error) {
    console.error("Could not create journal:", error);
    res.status(500).json({ message: "Could not create journal" });
  }
};

exports.updateJournal = async (req, res) => {
  try {
    const { title, content, mood, tags, isFavorite } = req.body;
    const journal = await Journal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!journal) return res.status(404).json({ message: "Journal not found" });
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) return res.status(400).json({ message: "Title cannot be empty." });
      if (title.trim().length > 150) return res.status(400).json({ message: "Title must be 150 characters or fewer." });
      journal.title = title.trim();
    }
    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) return res.status(400).json({ message: "Content cannot be empty." });
      if (content.length > 20000) return res.status(400).json({ message: "Journal content must be 20,000 characters or fewer." });
      journal.content = content;
    }
    if (mood !== undefined) journal.mood = mood;
    if (tags !== undefined) {
      if (!Array.isArray(tags)) return res.status(400).json({ message: "Tags must be a list." });
      journal.tags = tags;
    }
    if (isFavorite !== undefined) {
      if (typeof isFavorite !== "boolean") return res.status(400).json({ message: "Favorite status must be true or false." });
      journal.isFavorite = isFavorite;
    }
    await journal.save();
    res.json(journal);
  } catch (error) {
    console.error("Could not update journal:", error);
    res.status(500).json({ message: "Could not update journal" });
  }
};

exports.deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!journal) return res.status(404).json({ message: "Journal not found" });
    res.json({ message: "Journal deleted successfully" });
  } catch (error) {
    console.error("Could not delete journal:", error);
    res.status(500).json({ message: "Could not delete journal" });
  }
};

const Journal = require("../models/Journal");

exports.getJournals = async (req, res) => {
  try {
    const journals = await Journal.find({
      userId: req.user._id
    }).sort({ updatedAt: -1 });

    res.json(journals);
  } catch (error) {
    res.status(500).json({ message: "Could not load journals" });
  }
};

exports.createJournal = async (req, res) => {
  try {
    const { title, content, mood, tags } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        message: "Title and content are required"
      });
    }

    const journal = await Journal.create({
      userId: req.user._id,
      title: title.trim(),
      content: content.trim(),
      mood,
      tags
    });

    res.status(201).json(journal);
  } catch (error) {
    res.status(500).json({ message: "Could not create journal" });
  }
};

exports.updateJournal = async (req, res) => {
  try {
    const { title, content, mood, tags } = req.body;

    const journal = await Journal.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!journal) {
      return res.status(404).json({
        message: "Journal not found"
      });
    }

    if (title !== undefined) journal.title = title;
    if (content !== undefined) journal.content = content;
    if (mood !== undefined) journal.mood = mood;
    if (tags !== undefined) journal.tags = tags;

    await journal.save();
    res.json(journal);
  } catch (error) {
    res.status(500).json({ message: "Could not update journal" });
  }
};

exports.deleteJournal = async (req, res) => {
  try {
    const journal = await Journal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!journal) {
      return res.status(404).json({
        message: "Journal not found"
      });
    }

    res.json({ message: "Journal deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete journal" });
  }
};
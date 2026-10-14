exports.improveWriting = async (req, res) => {
  try {
    const { text } = req.body;

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        message: "Please provide text to improve"
      });
    }

    if (text.length > 10000) {
      return res.status(400).json({
        message: "Text is too long"
      });
    }

    // TODO: Call your chosen AI provider from the backend.
    // Send only text the user has chosen to submit.
    // Never expose the provider API key to the frontend.

    return res.status(501).json({
      message: "AI provider integration is not configured yet"
    });
  } catch (error) {
    return res.status(500).json({
      message: "AI request failed"
    });
  }
};
import {
  createSessionService,
  getSessionsService,
  searchSessionsService,
  renameSessionService,
  pinSessionService,
  archiveSessionService,
  deleteSessionService,
  createMessageService,
  getSessionMessagesService,
  feedbackService,
} from "../service/chat.service.js";

// ======================================================
// CREATE SESSION
// ======================================================

export const createSessionController = async (req, res, next) => {
  // Create a new chat session
  try {
    const { mode, projectId } = req.body || {};

    const session = await createSessionService({
      mode,
      projectId,
    });

    res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET SESSIONS
// ======================================================

export const getSessionsController = async (req, res, next) => {
  // Retrieve all chat sessions
  try {
    const sessions = await getSessionsService();

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// SEARCH SESSIONS
// ======================================================

export const searchSessionsController = async (req, res, next) => {
  try {
    const sessions = await searchSessionsService(req.query.q);

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET MESSAGES
// ======================================================

export const getSessionMessagesController = async (req, res, next) => {
  // Retrieve messages for a specific chat session
  try {
    const { sessionId } = req.params;

    const messages = await getSessionMessagesService(sessionId);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// CREATE MESSAGE
// ======================================================

export const createMessageController = async (req, res, next) => {
  // Create a new message in a specific chat session
  try {
    const { sessionId } = req.params;
    const { question } = req.body;

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }

    if (question.length > 8000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long (max 8000 characters).",
      });
    }

    console.log(`📩 POST /sessions/${sessionId}/messages`);

    const messages = await createMessageService(sessionId, question);

    res.status(201).json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// RENAME
// ======================================================

export const renameSessionController = async (req, res, next) => {
  // Rename a specific chat session
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    const session = await renameSessionService(id, title);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// PIN
// ======================================================

export const pinSessionController = async (req, res, next) => {
  // Pin or unpin a specific chat session
  try {
    const { id } = req.params;
    const { isPinned } = req.body;

    const session = await pinSessionService(id, isPinned);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// ARCHIVE
// ======================================================

export const archiveSessionController = async (req, res, next) => {
  // Archive a specific chat session
  try {
    const { id } = req.params;

    const result = await archiveSessionService(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ======================================================
// DELETE
// ======================================================

export const deleteSessionController = async (req, res, next) => {
  // Delete a specific chat session
  try {
    const { id } = req.params;

    const result = await deleteSessionService(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ======================================================
// FEEDBACK
// ======================================================

export const feedbackController = async (req, res, next) => {
  // Handle feedback for a specific message in a chat session
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    const message = await feedbackService(id, feedback);

    res.json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

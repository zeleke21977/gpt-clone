import express from "express";

import {
  createSessionController,
  getSessionsController,
  searchSessionsController,
  renameSessionController,
  pinSessionController,
  archiveSessionController,
  deleteSessionController,
  createMessageController,
  getSessionMessagesController,
  feedbackController,
} from "./controller/chat.controller.js";

const chatRouter = express.Router();

// ==========================================
// CHAT SESSIONS
// ==========================================

// Create new chat
chatRouter.post("/sessions", createSessionController);

// Get all chats
chatRouter.get("/sessions", getSessionsController);

// Search chats (title + message content)
chatRouter.get("/sessions/search", searchSessionsController);

// Rename chat
chatRouter.patch("/sessions/:id/rename", renameSessionController);

// Pin / unpin chat
chatRouter.patch("/sessions/:id/pin", pinSessionController);

// Archive chat
chatRouter.patch("/sessions/:id/archive", archiveSessionController);

// Delete chat
chatRouter.delete("/sessions/:id", deleteSessionController);

// ==========================================
// MESSAGES
// ==========================================

// Send message
chatRouter.post("/sessions/:sessionId/messages", createMessageController);

// Get messages
chatRouter.get("/sessions/:sessionId/messages", getSessionMessagesController);

// ==========================================
// MESSAGE FEEDBACK
// ==========================================

chatRouter.patch("/messages/:id/feedback", feedbackController);

export default chatRouter;

import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";
import { MODES, isValidMode, buildSystemInstruction } from "../prompts.js";

// ======================================================
// GEMINI CONFIG
// ======================================================

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const gemini = new GoogleGenAI({
  // Initialize the GoogleGenAI client
  apiKey: process.env.GEMINI_API_KEY,
});

// ======================================================
// CREATE SESSION
// ======================================================

export const createSessionService = async ({
  mode = "chat",
  projectId = null,
} = {}) => {
  const safeMode = isValidMode(mode) ? mode : "chat";
  let safeProjectId = null;

  if (projectId) {
    const [projects] = await db.execute(
      `SELECT id FROM projects WHERE id = ?`,
      [projectId],
    );

    if (projects.length === 0) {
      throw new Error("Project not found.");
    }

    safeProjectId = projects[0].id;
  }

  const [result] = await db.execute(
    `INSERT INTO chat_sessions (title, mode, project_id)
     VALUES (?, ?, ?)`,
    ["New chat", safeMode, safeProjectId],
  );

  const [rows] = await db.execute(
    `SELECT *
     FROM chat_sessions
     WHERE id = ?`,
    [result.insertId],
  );

  return rows[0];
};

// ======================================================
// GET SESSIONS
// ======================================================

export const getSessionsService = async () => {
  const [rows] = await db.execute(
    `SELECT *
     FROM chat_sessions
     WHERE is_archived = FALSE
     ORDER BY is_pinned DESC, updated_at DESC`,
  );

  return rows;
};

// ======================================================
// SEARCH SESSIONS (title + message content)
// ======================================================

export const searchSessionsService = async (query) => {
  const clean = (query || "").trim().slice(0, 100);

  if (!clean) {
    return [];
  }

  const like = `%${clean.replace(/[\\%_]/g, "\\$&")}%`;

  const [rows] = await db.execute(
    `SELECT s.*,
            (
              SELECT c.content
              FROM conversations c
              WHERE c.conversation_id = s.id
                AND c.content LIKE ?
              ORDER BY c.created_at ASC
              LIMIT 1
            ) AS snippet
     FROM chat_sessions s
     WHERE s.is_archived = FALSE
       AND (
         s.title LIKE ?
         OR EXISTS (
           SELECT 1 FROM conversations c2
           WHERE c2.conversation_id = s.id
             AND c2.content LIKE ?
         )
       )
     ORDER BY s.updated_at DESC
     LIMIT 30`,
    [like, like, like],
  );

  return rows;
};

// ======================================================
// GET MESSAGES
// ======================================================

export const getSessionMessagesService = async (sessionId, limit = 100) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);

  const [owned] = await db.execute(`SELECT id FROM chat_sessions WHERE id = ?`, [
    sessionId,
  ]);

  if (owned.length === 0) {
    throw new Error("Chat session not found.");
  }

  // Take the LATEST messages, then put them back in chronological order
  const [rows] = await db.query(
    `SELECT *
     FROM (
       SELECT id, conversation_id, role, content, token_count, feedback, created_at
       FROM conversations
       WHERE conversation_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ${safeLimit}
     ) latest
     ORDER BY created_at ASC, id ASC`,
    [sessionId],
  );

  return rows;
};

// ======================================================
// GENERATE GEMINI RESPONSE
// ======================================================

const generateGeminiResponse = async (
  session,
  question,
  currentMessageId,
  projectInstructions,
) => {
  console.log("=================================");
  console.log("Sending question to Gemini:");
  console.log(question);

  // ----------------------------------------------------
  // GET PREVIOUS CONVERSATION HISTORY
  // ----------------------------------------------------
  // The current question is already saved in the database,
  // so it is excluded here and sent separately.
  // We take the LATEST 20 messages, in chronological order.
  // ----------------------------------------------------

  const [historyRows] = await db.execute(
    `SELECT role, content
     FROM conversations
     WHERE conversation_id = ?
       AND id <> ?
     ORDER BY created_at DESC, id DESC
     LIMIT 20`,
    [session.id, currentMessageId],
  );

  const history = historyRows.reverse().map((row) => ({
    role: row.role === "assistant" ? "model" : "user",
    parts: [{ text: row.content }],
  }));

  console.log("Previous Gemini history:", history.length);

  const mode = isValidMode(session.mode) ? session.mode : "chat";
  const systemInstruction = buildSystemInstruction(mode, projectInstructions);

  const baseConfig = {
    maxOutputTokens: 8192,
    ...(systemInstruction ? { systemInstruction } : {}),
  };

  const ask = async (config) => {
    const chat = gemini.chats.create({
      model: GEMINI_MODEL,
      config,
      history,
    });

    return chat.sendMessage({ message: question });
  };

  try {
    let result;

    if (MODES[mode]?.search) {
      // Deep research uses Google Search grounding.
      // If it is not available for this key/model, retry without it.
      try {
        result = await ask({ ...baseConfig, tools: [{ googleSearch: {} }] });
      } catch (searchError) {
        console.warn(
          " Search grounding failed, retrying without it:",
          searchError?.message || searchError,
        );
        result = await ask(baseConfig);
      }
    } else {
      result = await ask(baseConfig);
    }

    console.log(" Gemini response received");

    const text = result.text || "Sorry, I could not generate a response.";
    const totalTokens = result.usageMetadata?.totalTokenCount || 0;

    console.log(" Total tokens:", totalTokens);
    console.log("=================================");

    return { text, totalTokens };
  } catch (error) {
    console.error(" GEMINI ERROR:");
    console.error(error?.message || error);

    throw error;
  }
};

// ======================================================
// CREATE MESSAGE
// ======================================================

export const createMessageService = async (sessionId, question) => {
  // ----------------------------------------------------
  // VALIDATE QUESTION
  // ----------------------------------------------------

  if (!question || !question.trim()) {
    throw new Error("Question cannot be empty.");
  }

  const cleanQuestion = question.trim();

  // ----------------------------------------------------
  // CHECK SESSION
  // ----------------------------------------------------

  const [sessionRows] = await db.execute(
    `SELECT *
     FROM chat_sessions
     WHERE id = ?`,
    [sessionId],
  );

  if (sessionRows.length === 0) {
    throw new Error("Chat session not found.");
  }

  const session = sessionRows[0];

  let projectInstructions = null;

  if (session.project_id) {
    const [projectRows] = await db.execute(
      `SELECT instructions FROM projects WHERE id = ?`,
      [session.project_id],
    );

    projectInstructions = projectRows[0]?.instructions || null;
  }

  // ----------------------------------------------------
  // SAVE USER QUESTION
  // ----------------------------------------------------

  const [userResult] = await db.execute(
    `INSERT INTO conversations
      (
        conversation_id,
        role,
        content
      )
     VALUES (?, 'user', ?)`,
    [sessionId, cleanQuestion],
  );

  const userMessageId = userResult.insertId;

  console.log(`User question saved. Message ID: ${userMessageId}`);

  try {
    // --------------------------------------------------
    // ASK GEMINI
    // --------------------------------------------------

    const aiResponse = await generateGeminiResponse(
      session,
      cleanQuestion,
      userMessageId,
      projectInstructions,
    );

    // --------------------------------------------------
    // SAVE ASSISTANT RESPONSE
    // --------------------------------------------------

    const [assistantResult] = await db.execute(
      `INSERT INTO conversations
          (
            conversation_id,
            role,
            content,
            token_count
          )
         VALUES (?, 'assistant', ?, ?)`,
      [sessionId, aiResponse.text, aiResponse.totalTokens],
    );

    const assistantMessageId = assistantResult.insertId;

    console.log(` Assistant response saved. Message ID: ${assistantMessageId}`);

    // --------------------------------------------------
    // COUNT MESSAGES
    // --------------------------------------------------

    const [messageCount] = await db.execute(
      `SELECT COUNT(*) AS count
         FROM conversations
         WHERE conversation_id = ?`,
      [sessionId],
    );

    // --------------------------------------------------
    // CREATE TITLE FROM FIRST QUESTION
    // --------------------------------------------------

    if (Number(messageCount[0].count) === 2) {
      let title = cleanQuestion.substring(0, 50);

      if (cleanQuestion.length > 50) {
        title += "...";
      }

      await db.execute(
        `UPDATE chat_sessions
         SET title = ?
         WHERE id = ?`,
        [title, sessionId],
      );

      console.log(` Chat title updated: ${title}`);
    }

    // --------------------------------------------------
    // UPDATE SESSION TIME
    // --------------------------------------------------

    await db.execute(
      `UPDATE chat_sessions
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sessionId],
    );

    // --------------------------------------------------
    // GET SAVED MESSAGES
    // --------------------------------------------------

    const [rows] = await db.execute(
      `SELECT
        id,
        conversation_id,
        role,
        content,
        token_count,
        feedback,
        created_at
       FROM conversations
       WHERE id IN (?, ?)
       ORDER BY id ASC`,
      [userMessageId, assistantMessageId],
    );

    return rows;
  } catch (error) {
    console.error(" Message processing failed:", error?.message || error);

    // --------------------------------------------------
    // REMOVE USER MESSAGE IF GEMINI FAILS
    // --------------------------------------------------

    await db.execute(
      `DELETE FROM conversations
       WHERE id = ?`,
      [userMessageId],
    );

    throw error;
  }
};

// ======================================================
// RENAME SESSION
// ======================================================

export const renameSessionService = async (sessionId, title) => {
  const cleanTitle = title?.trim();

  if (!cleanTitle) {
    throw new Error("Chat title cannot be empty.");
  }

  await db.execute(
    `UPDATE chat_sessions
     SET title = ?
     WHERE id = ?`,
    [cleanTitle.slice(0, 255), sessionId],
  );

  const [rows] = await db.execute(
    `SELECT *
     FROM chat_sessions
     WHERE id = ?`,
    [sessionId],
  );

  if (rows.length === 0) {
    throw new Error("Chat session not found.");
  }

  return rows[0];
};

// ======================================================
// PIN SESSION
// ======================================================

export const pinSessionService = async (sessionId, isPinned) => {
  await db.execute(
    `UPDATE chat_sessions
     SET is_pinned = ?
     WHERE id = ?`,
    [isPinned ? 1 : 0, sessionId],
  );

  const [rows] = await db.execute(
    `SELECT *
     FROM chat_sessions
     WHERE id = ?`,
    [sessionId],
  );

  if (rows.length === 0) {
    throw new Error("Chat session not found.");
  }

  return rows[0];
};

// ======================================================
// ARCHIVE SESSION
// ======================================================

export const archiveSessionService = async (sessionId) => {
  const [result] = await db.execute(
    `UPDATE chat_sessions
     SET is_archived = TRUE
     WHERE id = ?`,
    [sessionId],
  );

  if (result.affectedRows === 0) {
    throw new Error("Chat session not found.");
  }

  return {
    success: true,
  };
};

// ======================================================
// DELETE SESSION
// ======================================================

export const deleteSessionService = async (sessionId) => {
  const [result] = await db.execute(
    `DELETE FROM chat_sessions
     WHERE id = ?`,
    [sessionId],
  );

  if (result.affectedRows === 0) {
    throw new Error("Chat session not found.");
  }

  return {
    success: true,
  };
};

// ======================================================
// FEEDBACK
// ======================================================

export const feedbackService = async (messageId, feedback) => {
  // ----------------------------------------------------
  // VALIDATE FEEDBACK
  // ----------------------------------------------------

  if (feedback !== null && feedback !== "like" && feedback !== "dislike") {
    throw new Error("Feedback must be like, dislike, or null.");
  }

  // ----------------------------------------------------
  // FIND ASSISTANT MESSAGE
  // ----------------------------------------------------

  const [messageRows] = await db.execute(
    `SELECT c.*
       FROM conversations c
       WHERE c.id = ?
       AND c.role = 'assistant'`,
    [messageId],
  );

  if (messageRows.length === 0) {
    throw new Error("Assistant message not found.");
  }

  // ----------------------------------------------------
  // UPDATE FEEDBACK
  // ----------------------------------------------------

  await db.execute(
    `UPDATE conversations
     SET feedback = ?
     WHERE id = ?`,
    [feedback, messageId],
  );

  // ----------------------------------------------------
  // RETURN UPDATED MESSAGE
  // ----------------------------------------------------

  const [rows] = await db.execute(
    `SELECT *
     FROM conversations
     WHERE id = ?`,
    [messageId],
  );

  return rows[0];
};

/**
 * GEMINI RESPONSE SERVICE
 * - Retries temporary Gemini API errors.
 * - Uses exponential backoff.
 * - Falls back without Google Search only for search configuration errors.
 * - Preserves conversation history.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------
// Check whether the Gemini error may be temporary
// ------------------------------------------------------
const isRetryableGeminiError = (error) => {
  const message = [
    error?.status,
    error?.code,
    error?.message,
    error?.statusText,
    JSON.stringify(error),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return (
    /\b(429|500|502|503|504)\b/.test(message) ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("HIGH DEMAND") ||
    message.includes("INTERNAL SERVER ERROR") ||
    message.includes("TIMED OUT") ||
    message.includes("TIMEOUT")
  );
};

// ------------------------------------------------------
// Check whether Google Search configuration is unsupported
// ------------------------------------------------------
const isSearchConfigurationError = (error) => {
  const message = [
    error?.message,
    error?.status,
    error?.code,
    JSON.stringify(error),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  // Do not fall back for temporary 503 errors.
  if (isRetryableGeminiError(error)) {
    return false;
  }

  return (
    message.includes("GOOGLE SEARCH") ||
    message.includes("GROUNDING") ||
    message.includes("UNSUPPORTED") ||
    message.includes("INVALID TOOL") ||
    message.includes("TOOLS ARE NOT SUPPORTED")
  );
};

// ------------------------------------------------------
// Retry Gemini requests with exponential backoff
// ------------------------------------------------------
const askGeminiWithRetry = async (ask, label = "Gemini") => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ask();
    } catch (error) {
      const retryable = isRetryableGeminiError(error);

      console.error(
        `${label} attempt ${attempt}/${maxAttempts} failed:`,
        error?.message || error,
      );

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      // 2 seconds, then 4 seconds.
      const waitMs = 2000 * 2 ** (attempt - 1);

      console.warn(`${label}: temporary error. Retrying in ${waitMs}ms.`);

      await sleep(waitMs);
    }
  }

  throw new Error(`${label} failed after retries.`);
};

// ------------------------------------------------------
// Generate response
// ------------------------------------------------------
const generateGeminiResponse = async (
  session,
  question,
  currentMessageId,
  projectInstructions,
) => {
  console.log("=================================");
  console.log("Sending question to Gemini");
  console.log("Model:", GEMINI_MODEL);
  console.log("Session ID:", session.id);

  // Avoid logging sensitive user conversation content.
  console.log("Question length:", String(question ?? "").length);

  // ----------------------------------------------------
  // 1. Get previous conversation history.
  // Exclude the message that was just submitted.
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

  const history = historyRows
    .reverse()
    .map((row) => ({
      role: row.role === "assistant" ? "model" : "user",
      parts: [{ text: String(row.content ?? "") }],
    }))
    // Gemini history must alternate user/model turns.
    // Filter unexpected roles and empty content.
    .filter(
      (item) =>
        (item.role === "user" || item.role === "model") &&
        item.parts[0].text.trim().length > 0,
    );

  console.log("Previous Gemini history:", history.length);

  // ----------------------------------------------------
  // 2. Select chat mode and system instructions.
  // ----------------------------------------------------
  const mode = isValidMode(session.mode) ? session.mode : "chat";

  const systemInstruction = buildSystemInstruction(mode, projectInstructions);

  const baseConfig = {
    maxOutputTokens: 8192,
    ...(systemInstruction ? { systemInstruction } : {}),
  };

  // ----------------------------------------------------
  // 3. Create and send the Gemini request.
  // ----------------------------------------------------
  const ask = async (useSearch = false) => {
    const config = useSearch
      ? {
          ...baseConfig,
          tools: [{ googleSearch: {} }],
        }
      : baseConfig;

    const chat = gemini.chats.create({
      model: GEMINI_MODEL,
      config,
      history,
    });

    return chat.sendMessage({
      message: String(question ?? ""),
    });
  };

  try {
    let result;

    // --------------------------------------------------
    // 4. Search mode with controlled fallback.
    // --------------------------------------------------
    if (MODES[mode]?.search) {
      try {
        result = await askGeminiWithRetry(() => ask(true), "Gemini Search");
      } catch (searchError) {
        if (!isSearchConfigurationError(searchError)) {
          throw searchError;
        }

        console.warn(
          "Search configuration unsupported. Retrying without Search.",
        );

        result = await askGeminiWithRetry(
          () => ask(false),
          "Gemini without Search",
        );
      }
    } else {
      result = await askGeminiWithRetry(() => ask(false), "Gemini");
    }

    // --------------------------------------------------
    // 5. Extract response text and token usage.
    // --------------------------------------------------
    const responseText =
      typeof result.text === "string" ? result.text.trim() : "";

    if (!responseText) {
      throw new Error("Gemini returned an empty response. Please try again.");
    }

    const totalTokens = result.usageMetadata?.totalTokenCount ?? 0;

    console.log("Gemini response received successfully.");
    console.log("Total tokens:", totalTokens);
    console.log("=================================");

    return {
      text: responseText,
      totalTokens,
    };
  } catch (error) {
    // Log the error for Render debugging.
    console.error("GEMINI REQUEST FAILED");
    console.error("Model:", GEMINI_MODEL);
    console.error("Status:", error?.status ?? "unknown");
    console.error("Code:", error?.code ?? "unknown");
    console.error("Message:", error?.message ?? "Unknown error");
    console.log("=================================");

    // Let the existing controller/error handler handle the error.
    throw error;
  }
};

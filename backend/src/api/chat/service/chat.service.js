// ======================================================
// GENERATE GEMINI RESPONSE WITH RETRY
// ======================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableGeminiError = (error) => {
  const message = [
    error?.status,
    error?.code,
    error?.message,
    JSON.stringify(error),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return (
    /\b(429|500|502|503|504)\b/.test(message) ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("HIGH DEMAND")
  );
};

const askGeminiWithRetry = async (ask) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ask();
    } catch (error) {
      if (attempt === maxAttempts || !isRetryableGeminiError(error)) {
        throw error;
      }

      const waitMs = 2000 * 2 ** (attempt - 1);

      console.warn(
        `Gemini temporary error. Attempt ${attempt}/${maxAttempts}. Retrying in ${waitMs}ms.`,
      );

      await sleep(waitMs);
    }
  }
};

const generateGeminiResponse = async (
  session,
  question,
  currentMessageId,
  projectInstructions,
) => {
  console.log("=================================");
  console.log("Sending question to Gemini:");
  console.log("Model:", GEMINI_MODEL);
  console.log("Question:", question);

  // Get previous conversation history, excluding current question.
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

  const ask = async (useSearch = false) => {
    const config = useSearch
      ? { ...baseConfig, tools: [{ googleSearch: {} }] }
      : baseConfig;

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
      try {
        // Retry temporary errors without immediately switching models.
        result = await askGeminiWithRetry(() => ask(true));
      } catch (searchError) {
        const message = [
          searchError?.message,
          searchError?.status,
          searchError?.code,
        ]
          .filter(Boolean)
          .join(" ")
          .toUpperCase();

        const likelySearchConfigError =
          message.includes("GOOGLE SEARCH") ||
          message.includes("TOOL") ||
          message.includes("GROUNDING") ||
          message.includes("UNSUPPORTED");

        // Only fall back when search/grounding appears unsupported.
        if (!likelySearchConfigError) {
          throw searchError;
        }

        console.warn(
          "Google Search grounding is unsupported. Retrying without search.",
        );

        result = await askGeminiWithRetry(() => ask(false));
      }
    } else {
      result = await askGeminiWithRetry(() => ask(false));
    }

    const text = result.text || "Sorry, I could not generate a response.";

    const totalTokens = result.usageMetadata?.totalTokenCount || 0;

    console.log("Gemini response received.");
    console.log("Total tokens:", totalTokens);
    console.log("=================================");

    return { text, totalTokens };
  } catch (error) {
    console.error("GEMINI ERROR:");
    console.error(error?.message || error);
    throw error;
  }
};

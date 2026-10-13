import { modeOf } from "../../modes.js";
import ChatInput from "../ChatInput/ChatInput.jsx";

import styles from "./ModeLanding.module.css";

const CONTENT = {
  deep_research: {
    title: "Deep research",
    subtitle:
      "Ask a big question and get a structured, searched report with findings and a conclusion.",
    suggestions: [
      "Compare solar and wind energy for Ethiopia",
      "How do mobile money services affect small businesses in East Africa?",
      "Pros and cons of learning React vs Vue in 2026",
    ],
    historyTitle: "Past research",
  },
  codex: {
    title: "Codex",
    subtitle:
      "Your coding assistant. Write, debug and explain code, with copy-ready code blocks.",
    suggestions: [
      "Write an Express route that paginates MySQL results",
      "Explain why my React useEffect runs twice",
      "Convert this callback code to async/await",
    ],
    historyTitle: "Past tasks",
  },
};

export default function ModeLanding({
  mode,
  sessions,
  onSubmit,
  onSelectSession,
  isLoading,
}) {
  const { icon: Icon } = modeOf(mode);
  const content = CONTENT[mode];

  return (
    <div className={styles.wrapper}>
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.iconCircle}>
            <Icon size={26} />
          </div>

          <h1>{content.title}</h1>
          <p>{content.subtitle}</p>
        </div>

        <div className={styles.suggestions}>
          {content.suggestions.map((text) => (
            <button
              key={text}
              type="button"
              disabled={isLoading}
              onClick={() => onSubmit(text)}
            >
              {text}
            </button>
          ))}
        </div>

        {sessions.length > 0 && (
          <div className={styles.history}>
            <h2>{content.historyTitle}</h2>

            {sessions.slice(0, 8).map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session)}
              >
                <Icon size={16} />
                <span>{session.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ChatInput
        mode={mode}
        handleSendMessage={onSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}

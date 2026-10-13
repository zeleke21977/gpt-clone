import { useEffect, useRef } from "react";

import ChatMessage from "../ChatMessage/ChatMessage.jsx";
import { modeOf } from "../../modes.js";

import styles from "./MessageList.module.css";

const WELCOME = {
  chat: "What's on your mind today?",
  deep_research: "What should I research?",
  codex: "What are we building?",
};

function MessageList({
  conversation,
  isLoading,
  isSending,
  mode = "chat",
  project,
  error,
}) {
  const bottomRef = useRef(null);

  // Always scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation.length, isSending]);

  if (isLoading && conversation.length === 0) {
    return (
      <div className={styles.messageList}>
        <div className={styles.noMessages}>Loading messages...</div>
      </div>
    );
  }

  const { label, icon: Icon } = modeOf(mode);

  return (
    <div className={styles.messageList}>
      {conversation.length === 0 ? (
        <div className={styles.noMessages}>
          <div className={styles.welcome}>
            {mode !== "chat" && <Icon size={30} />}

            <h1>{project ? project.name : WELCOME[mode] || label}</h1>

            {mode !== "chat" && !project && !WELCOME[mode] && (
              <p>Send a message to get started.</p>
            )}

            {project?.description && <p>{project.description}</p>}
          </div>
        </div>
      ) : (
        conversation.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))
      )}

      {isSending && conversation.length > 0 && (
        <div className={styles.thinking}>
          {mode === "deep_research" ? "Researching..." : "Thinking..."}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;

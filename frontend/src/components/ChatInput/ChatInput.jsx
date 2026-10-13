import { useState } from "react";

import { Plus, Mic, ArrowUp } from "lucide-react";

import { modeOf } from "../../modes.js";

import styles from "./ChatInput.module.css";

export default function ChatInput({
  handleSendMessage,
  isLoading,
  mode = "chat",
  autoFocus = true,
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const message = input.trim();

    if (!message || isLoading) {
      return;
    }

    handleSendMessage(message);

    setInput("");
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <button type="button" className={styles.icon} aria-label="Add">
          <Plus size={20} />
        </button>

        <input
          type="text"
          className={styles.input}
          placeholder={isLoading ? "Thinking..." : modeOf(mode).placeholder}
          autoFocus={autoFocus}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />

        {input.trim() ? (
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
            aria-label="Send message"
          >
            <ArrowUp size={18} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.icon}
            aria-label="Voice input"
          >
            <Mic size={20} />
          </button>
        )}
      </form>
    </div>
  );
}

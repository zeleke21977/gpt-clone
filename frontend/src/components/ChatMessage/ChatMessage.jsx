import { Children, isValidElement, useState } from "react";
import { User, Bot, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

import styles from "./ChatMessage.module.css";

// Code block with a language label and a copy button
function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);

  const codeElement = Children.toArray(children).find(isValidElement);
  const className = codeElement?.props?.className || "";
  const language = /language-(\S+)/.exec(className)?.[1] || "code";

  const text = String(codeElement?.props?.children ?? "").replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.codeWrapper}>
      <div className={styles.codeHeader}>
        <span>{language}</span>

        <button type="button" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre>{children}</pre>
    </div>
  );
}

const markdownComponents = { pre: CodeBlock };

function ChatMessage({ role, content }) {
  return (
    <div className={`${styles.message} ${styles[role]}`}>
      <div className={`${styles.avatar} ${styles[role]}`}>
        {role === "user" ? (
          <User size={18} color="white" />
        ) : (
          <Bot size={18} color="white" />
        )}
      </div>

      <div className={styles.content}>
        <ReactMarkdown components={markdownComponents}>
          {content || ""}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default ChatMessage;

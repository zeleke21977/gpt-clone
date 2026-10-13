import { useEffect, useRef, useState } from "react";
import { Search, SquarePen, MessageSquare, X } from "lucide-react";

import api, { errorMessage } from "../../api.js";
import styles from "./SearchModal.module.css";

// Shows a short piece of text around the first match
const makeSnippet = (text, query) => {
  if (!text) return "";

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, index - 30);
  const piece = text.slice(start, start + 110).replace(/\s+/g, " ");

  return `${start > 0 ? "…" : ""}${piece}${text.length > start + 110 ? "…" : ""}`;
};

export default function SearchModal({
  recentSessions = [],
  onClose,
  onSelectSession,
  onNewChat,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const trimmed = query.trim();

  // Search the backend 250ms after the user stops typing
  useEffect(() => {
    if (!trimmed) return undefined;

    const currentRequest = ++requestId.current;

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        setError("");

        const response = await api.get("/chat/sessions/search", {
          params: { q: trimmed },
        });

        if (currentRequest === requestId.current) {
          setResults(response.data.sessions || []);
        }
      } catch (err) {
        if (currentRequest === requestId.current) {
          setError(errorMessage(err));
        }
      } finally {
        if (currentRequest === requestId.current) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [trimmed]);

  // Esc closes
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const list = trimmed ? results : recentSessions.slice(0, 10);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-label="Search chats"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.searchRow}>
          <Search size={18} />

          <input
            autoFocus
            className={styles.input}
            placeholder="Search chats..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close search"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.results}>
          {!trimmed && (
            <button type="button" className={styles.row} onClick={onNewChat}>
              <SquarePen size={18} />
              <span className={styles.rowTitle}>New chat</span>
            </button>
          )}

          {!trimmed && list.length > 0 && (
            <div className={styles.groupLabel}>Recent</div>
          )}

          {list.map((session) => (
            <button
              key={session.id}
              type="button"
              className={styles.row}
              onClick={() => onSelectSession(session)}
            >
              <MessageSquare size={18} />

              <span className={styles.rowText}>
                <span className={styles.rowTitle}>
                  {session.title || "New chat"}
                </span>

                {trimmed && session.snippet && (
                  <span className={styles.snippet}>
                    {makeSnippet(session.snippet, trimmed)}
                  </span>
                )}
              </span>
            </button>
          ))}

          {trimmed && isSearching && list.length === 0 && (
            <div className={styles.message}>Searching...</div>
          )}

          {trimmed && !isSearching && !error && list.length === 0 && (
            <div className={styles.message}>No chats found for “{trimmed}”.</div>
          )}

          {error && <div className={`${styles.message} errorText`}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

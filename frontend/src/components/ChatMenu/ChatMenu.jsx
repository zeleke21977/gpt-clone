import { Share, Pencil, Pin, Archive, Trash2 } from "lucide-react";

import styles from "./ChatMenu.module.css";

export default function ChatMenu({
  conversation,
  onDelete,
  onRename,
  onPin,
  onArchive,
  onClose,
}) {
  // ==========================================
  // SHARE
  // ==========================================

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "ChatGPT conversation",
          text: conversation.title || "ChatGPT conversation",
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          conversation.title || "ChatGPT conversation",
        );

        alert("Conversation copied to clipboard.");
      }
    } catch {
      console.log("Share cancelled.");
    }

    onClose();
  };

  // ==========================================
  // RENAME
  // ==========================================

  const handleRename = () => {
    const newName = window.prompt(
      "Rename conversation:",
      conversation.title || "New chat",
    );

    if (newName && newName.trim()) {
      onRename(conversation.id, newName.trim());
    }

    onClose();
  };

  // ==========================================
  // PIN
  // ==========================================

  const handlePin = () => {
    onPin(conversation.id, !conversation.is_pinned);

    onClose();
  };

  // ==========================================
  // ARCHIVE
  // ==========================================

  const handleArchive = () => {
    onArchive(conversation.id);
    onClose();
  };

  // ==========================================
  // DELETE
  // ==========================================

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this chat?",
    );

    if (confirmed) {
      onDelete(conversation.id);
    }

    onClose();
  };

  return (
    <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
      {/* SHARE */}

      <button type="button" className={styles.menuItem} onClick={handleShare}>
        <Share size={18} />
        <span>Share</span>
      </button>

      {/* RENAME */}

      <button type="button" className={styles.menuItem} onClick={handleRename}>
        <Pencil size={18} />
        <span>Rename</span>
      </button>

      <div className={styles.separator} />

      {/* PIN */}

      <button type="button" className={styles.menuItem} onClick={handlePin}>
        <Pin size={18} />

        <span>{conversation.is_pinned ? "Unpin chat" : "Pin chat"}</span>
      </button>

      {/* ARCHIVE */}

      <button type="button" className={styles.menuItem} onClick={handleArchive}>
        <Archive size={18} />
        <span>Archive</span>
      </button>

      {/* DELETE */}

      <button
        type="button"
        className={`${styles.menuItem} ${styles.delete}`}
        onClick={handleDelete}
      >
        <Trash2 size={18} />
        <span>Delete</span>
      </button>
    </div>
  );
}

import { Folder } from "lucide-react";

import { modeOf } from "../../modes.js";
import styles from "./ChatHeader.module.css";

export default function ChatHeader({ activeSession, mode = "chat", project }) {
  const { label, icon: Icon } = modeOf(mode);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {mode !== "chat" && <Icon size={16} />}

        <span className={styles.title}>{activeSession?.title || label}</span>

        {project && (
          <span className={styles.badge}>
            <Folder size={13} />
            {project.name}
          </span>
        )}
      </div>
    </header>
  );
}

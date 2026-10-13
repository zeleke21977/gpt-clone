import { useEffect, useState } from "react";

import {
  SquarePen,
  Search,
  Images as ImageIcon,
  LayoutGrid,
  Microscope,
  Code2,
  FolderPlus,
  Folder,
  PanelLeftClose,
  MoreHorizontal,
  Pin,
} from "lucide-react";

import ChatMenu from "../ChatMenu/ChatMenu.jsx";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "deep_research", label: "Deep research", icon: Microscope },
  { id: "codex", label: "Codex", icon: Code2 },
];

const MAX_PROJECTS_SHOWN = 6;

function Sidebar({
  view,
  sessions = [],
  projects = [],
  activeSession,
  openProjectId,
  onSelectView,
  onNewChat,
  onOpenSearch,
  onClose,
  onSelectSession,
  onOpenProject,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  onArchiveSession,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);

  // Recents = chats that are not inside a project
  const recents = sessions.filter((session) => !session.project_id);

  const handleMenuClick = (e, sessionId) => {
    e.stopPropagation();
    setOpenMenuId((currentId) => (currentId === sessionId ? null : sessionId));
  };

  const closeMenu = () => setOpenMenuId(null);

  useEffect(() => {
    if (openMenuId === null) return undefined;

    const handleClickOutside = () => setOpenMenuId(null);

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  return (
    <aside className={styles.sidebar}>
      {/* HEADER */}

      <div className={styles.header}>
        <span className={styles.brand}>ChatGPT</span>

        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            type="button"
            onClick={onOpenSearch}
            aria-label="Search chats"
          >
            <Search size={18} />
          </button>

          <button
            className={styles.iconBtn}
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      {/* NAVIGATION */}

      <nav className={styles.nav}>
        <button type="button" className={styles.item} onClick={onNewChat}>
          <SquarePen size={18} />
          <span>New chat</span>
        </button>

        <button type="button" className={styles.item} onClick={onOpenSearch}>
          <Search size={18} />
          <span>Search chats</span>
        </button>

        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.item} ${view === id ? styles.itemActive : ""}`}
            onClick={() => onSelectView(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* SCROLLING AREA: PROJECTS + RECENTS */}

      <div className={styles.scrollArea}>
        {/* PROJECTS */}

        <div className={styles.sectionHeader}>
          <button
            type="button"
            className={`${styles.sectionTitle} ${
              view === "projects" && openProjectId === null
                ? styles.sectionTitleActive
                : ""
            }`}
            onClick={() => onSelectView("projects")}
          >
            Projects
          </button>

          <button
            type="button"
            className={styles.sectionAction}
            aria-label="All projects"
            title="New project"
            onClick={() => onSelectView("projects")}
          >
            <FolderPlus size={16} />
          </button>
        </div>

        {projects.length === 0 ? (
          <button
            type="button"
            className={styles.emptyAction}
            onClick={() => onSelectView("projects")}
          >
            Create your first project
          </button>
        ) : (
          <>
            {projects.slice(0, MAX_PROJECTS_SHOWN).map((project) => (
              <button
                key={project.id}
                type="button"
                className={`${styles.item} ${
                  view === "projects" && openProjectId === project.id
                    ? styles.itemActive
                    : ""
                }`}
                onClick={() => onOpenProject(project.id)}
              >
                <Folder size={18} />
                <span className={styles.ellipsis}>{project.name}</span>
              </button>
            ))}

            {projects.length > MAX_PROJECTS_SHOWN && (
              <button
                type="button"
                className={styles.emptyAction}
                onClick={() => onSelectView("projects")}
              >
                See all ({projects.length})
              </button>
            )}
          </>
        )}

        {/* RECENTS */}

        <div className={styles.historyTitle}>
          <span>Recents</span>
        </div>

        {recents.length === 0 ? (
          <div className={styles.emptyChats}>No chats yet</div>
        ) : (
          recents.map((session) => (
            <div
              key={session.id}
              className={`${styles.chatItem} ${
                view === "chat" && activeSession?.id === session.id
                  ? styles.active
                  : ""
              }`}
            >
              <button
                type="button"
                className={styles.chatButton}
                onClick={() => {
                  closeMenu();
                  onSelectSession(session);
                }}
              >
                {Boolean(session.is_pinned) && <Pin size={13} />}

                <span>{session.title || "New chat"}</span>
              </button>

              <button
                type="button"
                className={styles.moreButton}
                aria-label="Chat options"
                onClick={(e) => handleMenuClick(e, session.id)}
              >
                <MoreHorizontal size={17} />
              </button>

              {openMenuId === session.id && (
                <div onClick={(e) => e.stopPropagation()}>
                  <ChatMenu
                    conversation={session}
                    onDelete={onDeleteSession}
                    onRename={onRenameSession}
                    onPin={onPinSession}
                    onArchive={onArchiveSession}
                    onClose={closeMenu}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default Sidebar;

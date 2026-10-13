import { useState } from "react";
import {
  Folder,
  FolderPlus,
  ArrowLeft,
  Pencil,
  Trash2,
  MessageSquare,
  X,
} from "lucide-react";

import { errorMessage } from "../../api.js";
import ChatInput from "../ChatInput/ChatInput.jsx";

import styles from "./ProjectsPage.module.css";

// ======================================================
// Create / edit form (modal)
// ======================================================

function ProjectForm({ project, onSave, onClose }) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [instructions, setInstructions] = useState(project?.instructions || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError("");

      await onSave({
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
      });

      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className={styles.modalHeader}>
          <h2>{project ? "Edit project" : "New project"}</h2>

          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label>
          Name
          <input
            autoFocus
            value={name}
            maxLength={255}
            placeholder="e.g. Forum presentation"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label>
          Description (optional)
          <input
            value={description}
            maxLength={500}
            placeholder="What is this project about?"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label>
          Instructions (optional)
          <textarea
            rows={5}
            value={instructions}
            maxLength={8000}
            placeholder="How should ChatGPT respond in this project? e.g. Always answer in Amharic and keep it short."
            onChange={(e) => setInstructions(e.target.value)}
          />
        </label>

        {error && <p className="errorText">{error}</p>}

        <div className={styles.modalActions}>
          <button type="button" className="secondaryBtn" onClick={onClose}>
            Cancel
          </button>

          <button
            type="submit"
            className="primaryBtn"
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? "Saving..." : project ? "Save" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ======================================================
// Page
// ======================================================

export default function ProjectsPage({
  projects,
  sessions,
  openProjectId,
  onOpenProject,
  onBack,
  onCreate,
  onUpdate,
  onDelete,
  onNewChat,
  onSelectSession,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const project = projects.find((p) => p.id === openProjectId);

  // ---------------- DETAIL ----------------

  if (project) {
    const projectChats = sessions.filter((s) => s.project_id === project.id);

    const handleDelete = async () => {
      if (
        !window.confirm(
          `Delete "${project.name}" and all of its chats? This cannot be undone.`,
        )
      ) {
        return;
      }

      try {
        await onDelete(project.id);
      } catch (err) {
        setError(errorMessage(err));
      }
    };

    return (
      <div className={styles.detail}>
        <div className="page">
          <div className="pageInner">
            <button type="button" className={styles.back} onClick={onBack}>
              <ArrowLeft size={16} /> All projects
            </button>

            <div className={styles.detailHeader}>
              <div className={styles.detailTitle}>
                <Folder size={26} />
                <h1>{project.name}</h1>
              </div>

              <div className={styles.detailActions}>
                <button
                  type="button"
                  className="secondaryBtn"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={15} /> Edit
                </button>

                <button
                  type="button"
                  className="secondaryBtn"
                  onClick={handleDelete}
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div>

            {project.description && (
              <p className={styles.description}>{project.description}</p>
            )}

            {project.instructions && (
              <div className={styles.instructions}>
                <strong>Instructions</strong>
                <p>{project.instructions}</p>
              </div>
            )}

            {error && <p className="errorText">{error}</p>}

            <h2 className={styles.sectionTitle}>Chats</h2>

            {projectChats.length === 0 ? (
              <p className={styles.empty}>
                No chats yet. Start one below — it will follow this project’s
                instructions.
              </p>
            ) : (
              <div className={styles.chatList}>
                {projectChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => onSelectSession(chat)}
                  >
                    <MessageSquare size={16} />
                    <span>{chat.title || "New chat"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <ChatInput
          key={project.id}
          autoFocus={false}
          handleSendMessage={(text) => onNewChat(project.id, text)}
          isLoading={false}
        />

        {editing && (
          <ProjectForm
            project={project}
            onSave={(values) => onUpdate(project.id, values)}
            onClose={() => setEditing(false)}
          />
        )}
      </div>
    );
  }

  // ---------------- LIST ----------------

  return (
    <div className="page">
      <div className="pageInner">
        <div className={styles.listHeader}>
          <div>
            <h1 className="pageTitle">Projects</h1>
            <p className="pageSubtitle">
              Keep related chats together and give them shared instructions.
            </p>
          </div>

          <button
            type="button"
            className="primaryBtn"
            onClick={() => setFormOpen(true)}
          >
            <FolderPlus size={16} /> New project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className={styles.empty}>
            You have no projects yet. Create one to get started.
          </p>
        ) : (
          <div className={styles.grid}>
            {projects.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.card}
                onClick={() => onOpenProject(item.id)}
              >
                <Folder size={22} />

                <div>
                  <strong>{item.name}</strong>

                  <span>
                    {item.description ||
                      `${item.chat_count} chat${
                        Number(item.chat_count) === 1 ? "" : "s"
                      }`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <ProjectForm
          onSave={async (values) => {
            const created = await onCreate(values);
            onOpenProject(created.id);
          }}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { PanelLeftOpen } from "lucide-react";

import api, { errorMessage } from "./api.js";

import Sidebar from "./components/Sidebar/Sidebar.jsx";
import ChatHeader from "./components/ChatHeader/ChatHeader.jsx";
import MessageList from "./components/MessageList/MessageList.jsx";
import ChatInput from "./components/ChatInput/ChatInput.jsx";
import SearchModal from "./components/SearchModal/SearchModal.jsx";
import ModeLanding from "./components/ModeLanding/ModeLanding.jsx";
import ImagesPage from "./components/ImagesPage/ImagesPage.jsx";
import AppsPage from "./components/AppsPage/AppsPage.jsx";
import ProjectsPage from "./components/ProjectsPage/ProjectsPage.jsx";

const DEFAULT_DRAFT = { mode: "chat", projectId: null };

function App() {
  // ==========================================
  // STATE
  // ==========================================

  // chat | images | apps | deep_research | codex | projects
  const [view, setView] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openProjectId, setOpenProjectId] = useState(null);

  const [activeSession, setActiveSession] = useState(null);
  const [draft, setDraft] = useState(DEFAULT_DRAFT); // used when there is no session yet
  const [conversation, setConversation] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD DATA
  // ==========================================

  const fetchSessions = useCallback(async () => {
    try {
      const response = await api.get("/chat/sessions");
      setSessions(response.data.sessions || []);
    } catch (err) {
      console.error("❌ Error fetching sessions:", errorMessage(err));
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data.projects || []);
    } catch (err) {
      console.error("❌ Error fetching projects:", errorMessage(err));
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchProjects();
  }, [fetchSessions, fetchProjects]);

  // Ctrl/Cmd + K opens search
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ==========================================
  // NAVIGATION
  // ==========================================

  const startChat = (nextDraft = DEFAULT_DRAFT) => {
    setActiveSession(null);
    setConversation([]);
    setDraft(nextDraft);
    setError("");
    setView("chat");
  };

  // Sidebar: New chat
  const handleNewChat = () => startChat(DEFAULT_DRAFT);

  // Apps: open a tool in a fresh chat
  const handleOpenApp = (mode) => startChat({ mode, projectId: null });

  // Project page: new chat inside a project
  const handleNewProjectChat = (projectId, text) => {
    const projectDraft = { mode: "chat", projectId };

    if (text) {
      handleSendMessage(text, projectDraft);
    } else {
      startChat(projectDraft);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      setIsLoadingMessages(true);
      const response = await api.get(`/chat/sessions/${sessionId}/messages`);
      setConversation(response.data.messages || []);
    } catch (err) {
      console.error("❌ Error fetching messages:", errorMessage(err));
      setConversation([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectSession = async (session) => {
    setActiveSession(session);
    setDraft({ mode: session.mode || "chat", projectId: session.project_id });
    setError("");
    setView("chat");

    await fetchMessages(session.id);
  };

  const handleSelectView = (nextView) => {
    if (nextView === "projects") {
      setOpenProjectId(null);
    }
    setView(nextView);
  };

  const handleOpenProject = (projectId) => {
    setOpenProjectId(projectId);
    setView("projects");
  };

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const handleSendMessage = async (message, draftOverride) => {
    const cleanMessage = message.trim();

    if (!cleanMessage || isLoading) {
      return;
    }

    const targetDraft = draftOverride || draft;
    let session = draftOverride ? null : activeSession;

    setError("");
    setIsLoading(true);

    if (draftOverride) {
      setActiveSession(null);
      setConversation([]);
      setDraft(draftOverride);
      setView("chat");
    }

    const temporaryMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: cleanMessage,
    };

    try {
      // Create the session on the first message
      if (!session) {
        const response = await api.post("/chat/sessions", {
          mode: targetDraft.mode,
          projectId: targetDraft.projectId,
        });

        session = response.data.session;

        setSessions((prev) => [session, ...prev]);
        setActiveSession(session);
      }

      temporaryMessage.conversation_id = session.id;
      setConversation((prev) => [...prev, temporaryMessage]);

      const response = await api.post(`/chat/sessions/${session.id}/messages`, {
        question: cleanMessage,
      });

      setConversation((prev) => [
        ...prev.filter((msg) => msg.id !== temporaryMessage.id),
        ...(response.data.messages || []),
      ]);

      await Promise.all([fetchSessions(), fetchProjects()]);
    } catch (err) {
      console.error("❌ Error sending message:", errorMessage(err));

      setError(errorMessage(err));
      setConversation((prev) =>
        prev.filter((msg) => msg.id !== temporaryMessage.id),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // SESSION ACTIONS
  // ==========================================

  const clearIfActive = (sessionId) => {
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
      setConversation([]);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      clearIfActive(sessionId);
      fetchProjects();
    } catch (err) {
      console.error("❌ Error deleting session:", errorMessage(err));
    }
  };

  const handleRenameSession = async (sessionId, title) => {
    try {
      const response = await api.patch(`/chat/sessions/${sessionId}/rename`, {
        title,
      });
      const updated = response.data.session;

      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));

      if (activeSession?.id === sessionId) setActiveSession(updated);
    } catch (err) {
      console.error("❌ Error renaming session:", errorMessage(err));
    }
  };

  const handlePinSession = async (sessionId, isPinned) => {
    try {
      const response = await api.patch(`/chat/sessions/${sessionId}/pin`, {
        isPinned,
      });
      const updated = response.data.session;

      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));

      if (activeSession?.id === sessionId) setActiveSession(updated);
    } catch (err) {
      console.error("❌ Error pinning session:", errorMessage(err));
    }
  };

  const handleArchiveSession = async (sessionId) => {
    try {
      await api.patch(`/chat/sessions/${sessionId}/archive`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      clearIfActive(sessionId);
      fetchProjects();
    } catch (err) {
      console.error("❌ Error archiving session:", errorMessage(err));
    }
  };

  // ==========================================
  // PROJECT ACTIONS
  // ==========================================

  const handleCreateProject = async (values) => {
    const response = await api.post("/projects", values);
    const project = response.data.project;

    setProjects((prev) => [project, ...prev]);

    return project;
  };

  const handleUpdateProject = async (projectId, values) => {
    const response = await api.patch(`/projects/${projectId}`, values);
    const updated = response.data.project;

    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));

    return updated;
  };

  const handleDeleteProject = async (projectId) => {
    await api.delete(`/projects/${projectId}`);

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setSessions((prev) => prev.filter((s) => s.project_id !== projectId));

    if (activeSession?.project_id === projectId) {
      setActiveSession(null);
      setConversation([]);
    }

    setOpenProjectId(null);
  };

  // ==========================================
  // UI
  // ==========================================

  const currentMode = activeSession?.mode || draft.mode;
  const currentProject = projects.find(
    (p) => p.id === (activeSession?.project_id ?? draft.projectId),
  );

  const renderMain = () => {
    switch (view) {
      case "images":
        return <ImagesPage />;

      case "apps":
        return <AppsPage onOpenApp={handleOpenApp} />;

      case "deep_research":
      case "codex":
        return (
          <ModeLanding
            key={view}
            mode={view}
            sessions={sessions.filter((s) => s.mode === view)}
            onSubmit={(text) =>
              handleSendMessage(text, { mode: view, projectId: null })
            }
            onSelectSession={handleSelectSession}
            isLoading={isLoading}
          />
        );

      case "projects":
        return (
          <ProjectsPage
            projects={projects}
            sessions={sessions}
            openProjectId={openProjectId}
            onOpenProject={handleOpenProject}
            onBack={() => setOpenProjectId(null)}
            onCreate={handleCreateProject}
            onUpdate={handleUpdateProject}
            onDelete={handleDeleteProject}
            onNewChat={handleNewProjectChat}
            onSelectSession={handleSelectSession}
          />
        );

      default:
        return (
          <>
            <ChatHeader
              activeSession={activeSession}
              mode={currentMode}
              project={currentProject}
            />

            <MessageList
              conversation={conversation}
              isLoading={isLoadingMessages}
              isSending={isLoading}
              mode={currentMode}
              project={currentProject}
              error={error}
            />

            <ChatInput
              key={activeSession?.id ?? `new-${draft.mode}-${draft.projectId}`}
              mode={currentMode}
              handleSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </>
        );
    }
  };

  return (
    <div className="app">
      {sidebarOpen ? (
        <Sidebar
          view={view}
          sessions={sessions}
          projects={projects}
          activeSession={activeSession}
          openProjectId={openProjectId}
          onSelectView={handleSelectView}
          onNewChat={handleNewChat}
          onOpenSearch={() => setSearchOpen(true)}
          onClose={() => setSidebarOpen(false)}
          onSelectSession={handleSelectSession}
          onOpenProject={handleOpenProject}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          onPinSession={handlePinSession}
          onArchiveSession={handleArchiveSession}
        />
      ) : (
        <button
          type="button"
          className="openSidebar"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      <main className="chat">{renderMain()}</main>

      {searchOpen && (
        <SearchModal
          recentSessions={sessions}
          onClose={() => setSearchOpen(false)}
          onSelectSession={(session) => {
            setSearchOpen(false);
            handleSelectSession(session);
          }}
          onNewChat={() => {
            setSearchOpen(false);
            handleNewChat();
          }}
        />
      )}
    </div>
  );
}

export default App;

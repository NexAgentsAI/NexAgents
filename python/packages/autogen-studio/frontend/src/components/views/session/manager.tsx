import React, { useCallback, useEffect, useState, useContext } from "react";
import { message } from "antd";
import { useConfigStore } from "../../../hooks/store";
import { appContext } from "../../../hooks/provider";
import { sessionAPI } from "./api";
import { SessionEditor } from "./editor";
import type { Session } from "../../types/datamodel";
import ChatView from "./chat/chat";
import { Sidebar } from "./sidebar";

export const SessionManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sessionSidebar");
      return stored !== null ? JSON.parse(stored) : true;
    }
    return true; // Default value during SSR
  });
  const [messageApi, contextHolder] = message.useMessage();

  const { user } = useContext(appContext);
  const { session, setSession, sessions, setSessions } = useConfigStore();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sessionSidebar", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const fetchSessions = useCallback(async () => {
    if (!user?.email) return;

    try {
      setIsLoading(true);
      const data = await sessionAPI.listSessions(user.email);
      setSessions(data);
      if (!session && data.length > 0) {
        setSession(data[0]);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      messageApi.error("Error loading sessions");
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, setSessions, session, setSession]);

  const handleSaveSession = async (sessionData: Partial<Session>) => {
    if (!user?.email) return;

    try {
      if (sessionData.id) {
        const updated = await sessionAPI.updateSession(
          sessionData.id,
          sessionData,
          user.email
        );
        setSessions(sessions.map((s) => (s.id === updated.id ? updated : s)));
        if (session?.id === updated.id) {
          setSession(updated);
        }
      } else {
        const created = await sessionAPI.createSession(sessionData, user.email);
        setSessions([created, ...sessions]);
        setSession(created);
      }
      setIsEditorOpen(false);
      setEditingSession(undefined);
    } catch (error) {
      messageApi.error("Error saving session");
      console.error(error);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!user?.email) return;

    try {
      const response = await sessionAPI.deleteSession(sessionId, user.email);
      console.log("response", response);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (session?.id === sessionId || sessions.length === 0) {
        setSession(sessions[0] || null);
      }
      messageApi.success("Session deleted");
    } catch (error) {
      console.error("Error deleting session:", error);
      messageApi.error("Error deleting session");
    }
  };

  const handleSelectSession = async (selectedSession: Session) => {
    if (!user?.email || !selectedSession.id) return;

    try {
      setIsLoading(true);
      const data = await sessionAPI.getSession(selectedSession.id, user.email);
      setSession(data);
    } catch (error) {
      console.error("Error loading session:", error);
      messageApi.error("Error loading session");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="relative flex h-full w-full">
      {contextHolder}
      <div
        className={`absolute left-0 top-0 h-full transition-all duration-200 ease-in-out ${
          isSidebarOpen ? "w-64" : "w-12"
        }`}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          sessions={sessions}
          currentSession={session}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectSession={handleSelectSession}
          onEditSession={(session) => {
            setEditingSession(session);
            setIsEditorOpen(true);
          }}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <div
        className={`flex-1 transition-all duration-200 ${
          isSidebarOpen ? "ml-64" : "ml-12"
        }`}
      >
        {session && sessions.length > 0 ? (
          <div className="pl-4">
            {session && <ChatView session={session} />}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-secondary">
            No session selected. Create or select a session from the sidebar.
          </div>
        )}
      </div>

      <SessionEditor
        session={editingSession}
        isOpen={isEditorOpen}
        onSave={handleSaveSession}
        onCancel={() => {
          setIsEditorOpen(false);
          setEditingSession(undefined);
        }}
      />
    </div>
  );
};

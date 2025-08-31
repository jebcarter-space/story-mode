import type { CreativeSession, CreativeMessage, SavedIdea, Reminder } from '../types';
import { nanoid } from 'nanoid';

export function createCreativeAssistant() {
  let sessions = $state<{ [key: string]: CreativeSession }>({});
  let activeSessionId = $state<string | null>(null);

  // Load from localStorage
  $effect(() => {
    const stored = localStorage.getItem('creative-sessions');
    if (stored) {
      try {
        sessions = JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to parse stored creative sessions:', error);
      }
    }
  });

  // Save to localStorage when sessions change
  $effect(() => {
    localStorage.setItem('creative-sessions', JSON.stringify(sessions));
  });

  return {
    get sessions() {
      return sessions;
    },

    get activeSession() {
      return activeSessionId ? sessions[activeSessionId] : null;
    },

    get activeSessionId() {
      return activeSessionId;
    },

    startSession(contextId: string, mode: 'creative' | 'secretary' | 'gm' | 'brainstorm' = 'creative'): string {
      const id = nanoid();
      const session: CreativeSession = {
        id,
        contextId,
        mode,
        conversation: [],
        ideas: [],
        reminders: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      sessions[id] = session;
      activeSessionId = id;
      return id;
    },

    setActiveSession(sessionId: string | null) {
      activeSessionId = sessionId;
    },

    addMessage(message: Omit<CreativeMessage, 'timestamp'>) {
      if (!activeSessionId || !sessions[activeSessionId]) return;
      
      const fullMessage: CreativeMessage = {
        ...message,
        timestamp: new Date()
      };
      
      sessions[activeSessionId].conversation.push(fullMessage);
      sessions[activeSessionId].updatedAt = new Date();
    },

    changeMode(mode: 'creative' | 'secretary' | 'gm' | 'brainstorm') {
      if (!activeSessionId || !sessions[activeSessionId]) return;
      
      sessions[activeSessionId].mode = mode;
      sessions[activeSessionId].updatedAt = new Date();
    },

    saveIdea(idea: Omit<SavedIdea, 'id'>) {
      if (!activeSessionId || !sessions[activeSessionId]) return;
      
      const fullIdea: SavedIdea = {
        id: nanoid(),
        ...idea
      };
      
      sessions[activeSessionId].ideas.push(fullIdea);
      sessions[activeSessionId].updatedAt = new Date();
    },

    updateIdea(ideaId: string, updates: Partial<SavedIdea>) {
      if (!activeSessionId || !sessions[activeSessionId]) return;
      
      const ideaIndex = sessions[activeSessionId].ideas.findIndex(i => i.id === ideaId);
      if (ideaIndex !== -1) {
        sessions[activeSessionId].ideas[ideaIndex] = {
          ...sessions[activeSessionId].ideas[ideaIndex],
          ...updates
        };
        sessions[activeSessionId].updatedAt = new Date();
      }
    },

    removeIdea(ideaId: string) {
      if (!activeSessionId || !sessions[activeSessionId]) return;
      
      const ideaIndex = sessions[activeSessionId].ideas.findIndex(i => i.id === ideaId);
      if (ideaIndex !== -1) {
        sessions[activeSessionId].ideas.splice(ideaIndex, 1);
        sessions[activeSessionId].updatedAt = new Date();
      }
    },

    addReminder(reminder: Omit<Reminder, 'id'>) {
      if (!activeSessionId || !sessions[activeSessionId]) return;
      
      const fullReminder: Reminder = {
        id: nanoid(),
        ...reminder
      };
      
      sessions[activeSessionId].reminders.push(fullReminder);
      sessions[activeSessionId].updatedAt = new Date();
    },

    removeReminder(reminderId: string) {
      if (!activeSessionId || !sessions[activeSessionId]) return;
      
      const reminderIndex = sessions[activeSessionId].reminders.findIndex(r => r.id === reminderId);
      if (reminderIndex !== -1) {
        sessions[activeSessionId].reminders.splice(reminderIndex, 1);
        sessions[activeSessionId].updatedAt = new Date();
      }
    },

    getSessionsByContext(contextId: string): CreativeSession[] {
      return Object.values(sessions).filter(session => session.contextId === contextId);
    },

    deleteSession(sessionId: string) {
      if (sessions[sessionId]) {
        delete sessions[sessionId];
        if (activeSessionId === sessionId) {
          activeSessionId = null;
        }
      }
    },

    exportSessions() {
      return JSON.stringify(sessions, null, 2);
    },

    importSessions(data: string) {
      try {
        const importedSessions = JSON.parse(data);
        sessions = { ...sessions, ...importedSessions };
        return true;
      } catch (error) {
        console.error('Failed to import sessions:', error);
        return false;
      }
    }
  };
}
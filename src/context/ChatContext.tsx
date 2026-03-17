import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  openChat: (recipientId: string, recipientName: string) => void;
  closeChat: () => void;
  activeChat: { recipientId: string; recipientName: string } | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeChat, setActiveChat] = useState<{ recipientId: string; recipientName: string } | null>(null);

  const openChat = (recipientId: string, recipientName: string) => {
    setActiveChat({ recipientId, recipientName });
  };

  const closeChat = () => {
    setActiveChat(null);
  };

  return (
    <ChatContext.Provider value={{ openChat, closeChat, activeChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

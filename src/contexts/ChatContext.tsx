import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ChatContextType {
  readChats: Set<string>;
  markChatAsRead: (chatId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [readChats, setReadChats] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('readChats');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem('readChats', JSON.stringify(Array.from(readChats)));
  }, [readChats]);

  const markChatAsRead = (chatId: string) => {
    setReadChats((prev) => new Set(prev).add(chatId));
  };

  return (
    <ChatContext.Provider value={{ readChats, markChatAsRead }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

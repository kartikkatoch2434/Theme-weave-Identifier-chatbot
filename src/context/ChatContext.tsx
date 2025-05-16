
import React, { createContext, useContext, useState } from "react";
import { ChatMessage, DocumentResponse, Theme } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

interface ChatContextType {
  messages: ChatMessage[];
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string, documentResponses?: DocumentResponse[], themes?: Theme[]) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addUserMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addAssistantMessage = (content: string, documentResponses?: DocumentResponse[], themes?: Theme[]) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
      documentResponses,
      themes,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const clearMessages = () => {
    setMessages([]);
    toast.success("Chat history cleared");
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        addUserMessage,
        addAssistantMessage,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

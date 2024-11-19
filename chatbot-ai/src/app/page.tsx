"use client";
import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Plus, X, Edit2, Check } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender: "user" | "bot";
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const ChatInterface = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    setConversations(data || []);
    if (data && data.length > 0 && !activeConversation) {
      setActiveConversation(data[0]);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
  };

  const createNewConversation = async (): Promise<Conversation | null> => {
    const title = `Nova conversa ${conversations.length + 1}`;
    const { data, error } = await supabase
      .from("conversations")
      .insert([{ title }])
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return null;
    }

    const newConversation = data as Conversation;
    setConversations([newConversation, ...conversations]);
    return newConversation;
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (error) {
      console.error("Error deleting conversation:", error);
      return;
    }

    const updatedConversations = conversations.filter(
      (conv) => conv.id !== conversationId
    );
    setConversations(updatedConversations);

    if (activeConversation?.id === conversationId) {
      setActiveConversation(updatedConversations[0] || null);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsLoading(true);

    try {
      // Se não houver conversa ativa, cria uma nova
      let currentConversation = activeConversation;
      if (!currentConversation) {
        currentConversation = await createNewConversation();
        if (!currentConversation) return;
        setActiveConversation(currentConversation);
      }

      // Adiciona a mensagem do usuário ao estado local imediatamente
      const userMessage = {
        id: Date.now().toString(),
        conversation_id: currentConversation.id,
        content: inputMessage,
        sender: "user" as const,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");

      // Salva a mensagem do usuário no banco
      const { error: userMessageError } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: currentConversation.id,
            content: inputMessage,
            sender: "user",
          },
        ]);

      if (userMessageError) throw userMessageError;

      // Envia a mensagem para a API junto com o histórico da conversa
      const conversationHistory = messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMessage,
          history: conversationHistory,
        }),
      });

      const data = await response.json();

      // Adiciona a resposta do bot ao estado local
      const botMessage = {
        id: (Date.now() + 1).toString(),
        conversation_id: currentConversation.id,
        content: data.response,
        sender: "bot" as const,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);

      // Salva a resposta do bot no banco
      await supabase.from("messages").insert([
        {
          conversation_id: currentConversation.id,
          content: data.response,
          sender: "bot",
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#111B21]">
      {" "}
      {/* Fundo principal escuro */}
      {/* App Title */}
      <div className="bg-[#202C33] p-4 shadow-lg">
        {" "}
        {/* Cabeçalho escuro */}
        <h1 className="text-2xl font-bold text-[#E9EDEF] text-center">
          My Chatbot
        </h1>
      </div>
      {/* Tabs */}
      <div className="bg-[#202C33] flex flex-wrap items-center px-4 py-2 gap-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`group flex items-center min-w-[160px] max-w-full rounded-t-lg px-4 py-2 ${
              activeConversation?.id === conversation.id
                ? "bg-[#111B21] text-[#E9EDEF]"
                : "bg-[#2A3942] text-[#E9EDEF] hover:bg-[#384147]"
            }`}
          >
            <div
              className="flex-1 flex items-center cursor-pointer truncate"
              onClick={() => setActiveConversation(conversation)}
            >
              {editingTitle === conversation.id ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => setEditingTitle(null)}
                  onKeyPress={(e) => e.key === "Enter" && setEditingTitle(null)}
                  className="bg-transparent border-b border-[#00A884] text-[#E9EDEF] w-full focus:outline-none"
                />
              ) : (
                <span className="truncate">{conversation.title}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-[#384147] text-[#8696A0]"
              onClick={() => deleteConversation(conversation.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          onClick={createNewConversation}
          variant="ghost"
          size="sm"
          className="p-2 text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#384147] rounded-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0B141A]">
        {" "}
        {/* Área do chat escura */}
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <Card
                className={`max-w-[80%] p-3 ${
                  message.sender === "user"
                    ? "bg-[#005C4B] text-[#E9EDEF]" // Mensagens do usuário em verde escuro
                    : "bg-[#202C33] text-[#E9EDEF]" // Mensagens do bot em cinza escuro
                }`}
              >
                {message.content}
              </Card>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="bg-[#202C33] p-4">
          {" "}
          {/* Área de input escura */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-[#2A3942] text-[#E9EDEF] placeholder-[#8696A0] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00A884]"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="bg-[#00A884] hover:bg-[#02735E] text-[#E9EDEF]"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

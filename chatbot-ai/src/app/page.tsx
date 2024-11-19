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
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>("");
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
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingTitle]);

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

  const createNewConversation = async () => {
    const title = `New conversation ${conversations.length + 1}`;
    const { data, error } = await supabase
      .from("conversations")
      .insert([{ title }])
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }

    setConversations([data, ...conversations]);
    setActiveConversation(data);
    setMessages([]);
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

  const startEditingTitle = (conversation: Conversation) => {
    setEditingTitle(conversation.id);
    setNewTitle(conversation.title);
  };

  const saveTitle = async (conversationId: string) => {
    if (!newTitle.trim()) return;

    const { error } = await supabase
      .from("conversations")
      .update({ title: newTitle })
      .eq("id", conversationId);

    if (error) {
      console.error("Error updating conversation title:", error);
      return;
    }

    setConversations(
      conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, title: newTitle } : conv
      )
    );
    
    if (activeConversation?.id === conversationId) {
      setActiveConversation({ ...activeConversation, title: newTitle });
    }

    setEditingTitle(null);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeConversation) return;
    setIsLoading(true);

    try {
      const { data: userMessageData, error: userMessageError } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: activeConversation.id,
            content: inputMessage,
            sender: "user",
          },
        ])
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      setMessages((prev) => [...prev, userMessageData]);
      setInputMessage("");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputMessage }),
      });

      const data = await response.json();

      const { data: botMessageData, error: botMessageError } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: activeConversation.id,
            content: data.response,
            sender: "bot",
          },
        ])
        .select()
        .single();

      if (botMessageError) throw botMessageError;

      setMessages((prev) => [...prev, botMessageData]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* App Title */}
      <div className="bg-gray-800 p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-white text-center">My Chatbot</h1>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 flex items-center px-4 py-2 space-x-2 overflow-x-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`group flex items-center min-w-[180px] max-w-[240px] rounded-t-lg px-4 py-2 ${
              activeConversation?.id === conversation.id
                ? "bg-gray-900 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <div
              className="flex-1 flex items-center cursor-pointer"
              onClick={() => setActiveConversation(conversation)}
            >
              {editingTitle === conversation.id ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => saveTitle(conversation.id)}
                  onKeyPress={(e) => e.key === "Enter" && saveTitle(conversation.id)}
                  className="bg-transparent border-b border-blue-500 text-white w-full focus:outline-none"
                />
              ) : (
                <span className="truncate">{conversation.title}</span>
              )}
            </div>
            <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingTitle !== conversation.id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 hover:bg-gray-700 text-gray-400 hover:text-white"
                  onClick={() => startEditingTitle(conversation)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 hover:bg-gray-700 text-gray-400 hover:text-white"
                  onClick={() => saveTitle(conversation.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="p-1 hover:bg-gray-700 text-gray-400 hover:text-white"
                onClick={() => deleteConversation(conversation.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          onClick={createNewConversation}
          variant="ghost"
          size="sm"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900">
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
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-white"
                }`}
              >
                {message.content}
              </Card>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="bg-gray-800 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Digite sua mensagem..."
              disabled={!activeConversation}
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !activeConversation}
              className="bg-blue-600 hover:bg-blue-700"
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
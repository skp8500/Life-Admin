import { useState, useRef, useEffect } from "react";
import { useListGeminiConversations, useCreateGeminiConversation, useGetGeminiConversation, getListGeminiConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Plus, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GeminiMessage } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Chat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: conversations, isLoading: convLoading } = useListGeminiConversations();
  const createConversation = useCreateGeminiConversation();
  
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<GeminiMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: activeConv, isLoading: activeLoading } = useGetGeminiConversation(
    activeConvId!,
    { query: { enabled: !!activeConvId } }
  );

  useEffect(() => {
    if (activeConv?.messages) {
      setMessages(activeConv.messages);
    }
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreateNew = () => {
    createConversation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
          setActiveConvId(newConv.id);
          setMessages([]);
        }
      }
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeConvId || isStreaming) return;

    const userMessage: GeminiMessage = {
      id: Date.now(), // temp
      conversationId: activeConvId,
      role: 'user',
      content: inputMessage,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsStreaming(true);

    const tempBotMessage: GeminiMessage = {
      id: Date.now() + 1,
      conversationId: activeConvId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempBotMessage]);

    try {
      const response = await fetch(`/api/gemini/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage.content })
      });

      if (!response.ok) throw new Error("Failed to send message");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let currentBotText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  currentBotText += data.content;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      lastMsg.content = currentBotText;
                    }
                    return newMsgs;
                  });
                }
              } catch (e) {
                // ignore parse error on incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to connect to AI assistant.", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="w-64 border-r border-border bg-sidebar/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <Button onClick={handleCreateNew} className="w-full gap-2" disabled={createConversation.isPending} data-testid="button-new-chat">
            {createConversation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {convLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                    activeConvId === conv.id ? "bg-primary/20 text-primary font-medium" : "hover:bg-sidebar-accent"
                  }`}
                  data-testid={`button-conv-${conv.id}`}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col bg-background relative">
        {activeConvId ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-3xl mx-auto space-y-6">
                {activeLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-muted rounded-tl-none border border-border'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Assistant</span>
                          </div>
                        ) : null}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="p-4 border-t border-border bg-background/80 backdrop-blur">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask the AI assistant..."
                  className="flex-1"
                  disabled={isStreaming}
                  data-testid="input-chat"
                />
                <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isStreaming} data-testid="button-send-chat">
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
            <MessageSquare className="w-16 h-16 opacity-20" />
            <div>
              <h3 className="text-lg font-medium text-foreground">Task-Aware AI Assistant</h3>
              <p className="max-w-md mx-auto text-sm mt-2">Create a new chat to ask about your schedule, summarize notes, or break down complex projects.</p>
            </div>
            <Button onClick={handleCreateNew} variant="outline">Start Chatting</Button>
          </div>
        )}
      </div>
    </div>
  );
}

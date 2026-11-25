"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chat } from "@/components/Chat";
import { TaskTrace } from "@/components/TaskTrace";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { StagePanel } from "@/components/StagePanel";
import { FilePreviewDrawer } from "@/components/FilePreviewDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  runTask,
  fetchConversations,
  fetchConversationDetail,
  ConversationItem,
  TokenUsage,
} from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Play,
  FileCode,
  ArrowUpRight,
  Plus,
  BrainCircuit,
  MessageSquare,
} from "lucide-react";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  task?: string;
  finalAnswer?: string;
  logs?: string[];
  iterations?: number;
  status: "running" | "completed" | "error";
  usage?: TokenUsage;
  createdAt: Date;
  durationMs?: number;
}

const ROTATING_WORDS = [
  { text: "code", color: "text-blue-400" },
  { text: "test", color: "text-emerald-400" },
  { text: "learn", color: "text-purple-400" },
];

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [messages, setMessages] = React.useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [conversations, setConversations] = React.useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);
  const [activeConvTitle, setActiveConvTitle] = React.useState<string>("");
  const [activeConvMemory, setActiveConvMemory] = React.useState<string>("");
  const [currentUsage, setCurrentUsage] = React.useState<TokenUsage | undefined>();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [previewFilePath, setPreviewFilePath] = React.useState<string | null>(null);
  const [rotatingWordIndex, setRotatingWordIndex] = React.useState(0);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRotatingWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleCopyTask = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadConversations = React.useCallback(async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
    } catch (err) {
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleStartNewChat = () => {
    setActiveConvId(null);
    setActiveConvTitle("");
    setActiveConvMemory("");
    setMessages([]);
  };

  const handleSelectConversation = async (convId: string) => {
    if (isLoading) return;
    try {
      const detail = await fetchConversationDetail(convId);
      if (!detail) return;
      setActiveConvId(detail.id);
      setActiveConvTitle(detail.title);
      setActiveConvMemory(detail.memory || "");

      const convMessages: MessageItem[] = (detail.runs || []).map((r) => ({
        id: `run-${r.id}`,
        role: "user",
        task: r.task,
        status: r.status === "completed" ? "completed" : "error",
        finalAnswer: r.final_answer,
        logs: r.logs || [],
        iterations: r.iterations || 0,
        createdAt: new Date(r.created_at),
      }));
      setMessages(convMessages);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskSubmit = async (task: string) => {
    const startTime = Date.now();
    const messageId = `msg-${startTime}`;
    const userMessage: MessageItem = {
      id: messageId,
      role: "user",
      task,
      status: "running",
      logs: [],
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await runTask({
        task,
        model: "openai/gpt-oss-120b",
        base_url: "https://api.groq.com/openai/v1",
        max_iterations: 12,
        conversation_id: activeConvId || undefined,
      });

      const durationMs = Date.now() - startTime;

      if (response.conversation_id && !activeConvId) {
        setActiveConvId(response.conversation_id);
        setActiveConvTitle(task.slice(0, 45));
      }
      if (response.conversation_memory) {
        setActiveConvMemory(response.conversation_memory);
      }

      if (response.usage) {
        setCurrentUsage(response.usage);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
              ...msg,
              status: response.status === "completed" ? "completed" : "error",
              finalAnswer: response.final_answer,
              logs: response.logs || [],
              iterations: response.iterations || 0,
              usage: response.usage,
              durationMs,
            }
            : msg
        )
      );

      loadConversations();
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
              ...msg,
              status: "error",
              logs: [`Execution Error: ${err.message}`],
              finalAnswer: `Agent failed to complete task: ${err.message}`,
              durationMs,
            }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-sidebar text-foreground overflow-hidden font-sans transition-colors duration-200">
      {/* Sidebar: Past Runs & Context */}
      <aside
        className={`${isSidebarOpen ? "w-64 p-3.5" : "w-0 p-0"
          } bg-sidebar flex flex-col gap-3 shrink-0 transition-all duration-200 overflow-hidden relative`}
      >
        <div className="flex items-center justify-between min-w-[220px]">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight">
            <img
              src="/logo.png"
              alt="Deskie"
              className="w-8 h-8 rounded-lg object-contain shrink-0"
            />
            <span className="text-lg font-bold tracking-tight">Deskie</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40 min-w-[220px]">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            <span>Conversations</span>
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/70">{conversations.length}</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto min-w-[220px] no-scrollbar">
          <div className="space-y-1.5">
            {conversations.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/70 italic text-center py-6">
                No conversations yet.
              </div>
            ) : (
              conversations.map((c) => {
                const isActive = c.id === activeConvId;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`px-3 py-2 rounded-xl border text-[11px] transition-all cursor-pointer shadow-xs flex flex-col gap-1 ${isActive
                      ? "bg-blue-600/15 border-blue-500/40 text-blue-600 dark:text-blue-200 font-medium"
                      : "bg-background/60 hover:bg-background border-border/40 hover:border-border/80 text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-medium truncate leading-tight flex-1">
                        {c.title}
                      </span>
                      {c.run_count > 1 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08] text-muted-foreground shrink-0">
                          {c.run_count} turns
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Theme Switcher with Skiper26 Animation */}
        <div className="pt-2 min-w-[220px] shrink-0">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Split Workbench */}
      <div className={`flex-1 flex overflow-hidden ${isSidebarOpen ? "py-2.5 pr-2.5 pl-0" : "p-0"} gap-2.5`}>
        {/* Left Column: Conversation Stream & Terminal Activity */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background rounded-2xl border border-sidebar-border/70 shadow-xs min-w-[380px] transition-colors duration-200">
          {/* Header */}
          <header className="h-12 px-4 flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-md relative">
            <div className="flex items-center gap-2.5 min-w-0">
              {!isSidebarOpen && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
                    title="Expand sidebar"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                  <img
                    src="/logo.png"
                    alt="Deskie"
                    className="w-5 h-5 rounded-md object-contain shrink-0"
                  />
                </div>
              )}

              {activeConvTitle && (
                <h1 className="text-xs font-semibold tracking-tight truncate max-w-xs sm:max-w-md">
                  {activeConvTitle}
                </h1>
              )}
            </div>

            {/* Centered Brand Text */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none select-none">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Deskie
              </span>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartNewChat}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer border border-border/50"
                title="New Conversation"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>
          </header>

          {/* Scrollable Conversation Content */}
          <div className={`flex-1 overflow-y-auto px-5 py-5 ${messages.length === 0 ? "flex flex-col items-center justify-center" : ""}`}>
            <div className="max-w-2xl mx-auto space-y-6 w-full">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 my-auto select-none gap-3 text-center">
                  <div className="flex items-center justify-center gap-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground font-sans">
                    <span>Hi</span>
                    <img
                      src="/logo.png"
                      alt="Deskie"
                      className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 object-contain inline-block shrink-0"
                    />
                    <span>I&apos;m Deskie</span>
                  </div>
                  <div className="flex items-center justify-center text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium tracking-tight h-9 sm:h-10">
                    <span>How can we help you&nbsp;</span>
                    <span className="inline-flex items-center font-medium">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={ROTATING_WORDS[rotatingWordIndex].text}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={`inline-block ${ROTATING_WORDS[rotatingWordIndex].color}`}
                        >
                          {ROTATING_WORDS[rotatingWordIndex].text}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span>&nbsp;today?</span>
                  </div>
                </div>
              )}

                      {messages.map((msg) => (
                        <div key={msg.id} className="space-y-3 animate-in fade-in duration-300">
                          {/* User Message */}
                          <div className="flex flex-col items-end gap-1.5 ml-auto max-w-[90%]">
                            <div className="bg-blue-600 text-white rounded-2xl px-4 py-2 text-xs leading-relaxed whitespace-pre-wrap shadow-md border border-blue-500/30">
                              {msg.task}
                            </div>

                            <div className="flex items-center gap-1 text-muted-foreground/60 pr-1">
                              <button
                                type="button"
                                onClick={() => handleCopyTask(msg.id, msg.task || "")}
                                className="p-1 hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
                                title="Copy prompt"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => msg.task && handleTaskSubmit(msg.task)}
                                disabled={isLoading}
                                className="p-1 hover:text-foreground hover:bg-muted/60 rounded-md transition-colors disabled:opacity-40"
                                title="Reload prompt"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Agent Response */}
                          <div className="w-full">
                            <div className="space-y-3 bg-[#131417]/80 backdrop-blur-xl border border-white/[0.07] shadow-xl rounded-2xl p-4">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src="/logo.png"
                                    alt="Deskie Agent"
                                    className="w-5 h-5 rounded-md object-contain shrink-0"
                                  />
                                  <span className="text-blue-400 font-medium text-xs">Deskie Agent</span>
                                  {msg.status === "running" ? (
                                    <span className="text-[10px] text-muted-foreground font-normal animate-pulse">
                                      Executing in sandbox...
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-blue-400/80 bg-blue-500/10 px-1.5 py-0.2 rounded font-mono border border-blue-500/20">
                                      done
                                    </span>
                                  )}
                                </div>

                                {msg.status === "running" ? (
                                  <span className="text-[10px] font-mono text-blue-400 animate-pulse flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                    <Clock className="h-3 w-3" />
                                    <span>{elapsedSeconds}s</span>
                                  </span>
                                ) : msg.durationMs ? (
                                  <span className="text-[10px] font-mono text-muted-foreground/80 flex items-center gap-1 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                                    <Clock className="h-3 w-3 text-muted-foreground/60" />
                                    <span>{(msg.durationMs / 1000).toFixed(1)}s</span>
                                  </span>
                                ) : null}
                              </div>

                              {/* Task Trace */}
                              <TaskTrace
                                status={msg.status}
                                iterations={msg.iterations || (msg.status === "running" ? 1 : 0)}
                                logs={msg.logs || []}
                                onPreviewFile={(f) => setPreviewFilePath(f)}
                              />

                              {/* Discovered files */}
                              {(() => {
                                const files = new Set<string>();
                                (msg.logs || []).forEach((log) => {
                                  const m1 = /Action:\s*write_file\(\{.*?'path':\s*['"]([^'"]+)['"]/.exec(log);
                                  const m2 = /Saved\s+([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)/.exec(log);
                                  if (m1 && m1[1]) files.add(m1[1]);
                                  if (m2 && m2[1]) files.add(m2[1]);
                                });
                                if (msg.finalAnswer) {
                                  const mAns = /\b([a-zA-Z0-9_\-]+\.(html|py|ts|tsx|js|json|css|md))\b/g;
                                  let match;
                                  while ((match = mAns.exec(msg.finalAnswer)) !== null) {
                                    if (match[1]) files.add(match[1]);
                                  }
                                }
                                const fileList = Array.from(files);
                                if (fileList.length === 0) return null;

                                return (
                                  <div className="space-y-1.5 py-1">
                                    {fileList.map((f) => {
                                      const isHtml = f.endsWith(".html");
                                      const isSelected = previewFilePath === f;
                                      return (
                                        <div
                                          key={f}
                                          onClick={() => setPreviewFilePath(f)}
                                          className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${isSelected
                                            ? "bg-blue-600/15 border-blue-500/50 text-white"
                                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.07] hover:border-blue-500/30"
                                            }`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                              {isHtml ? <Play className="h-3.5 w-3.5" /> : <FileCode className="h-3.5 w-3.5" />}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="text-xs font-mono font-medium text-foreground group-hover:text-blue-300 transition-colors truncate">
                                                {f}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 text-[11px] text-blue-400 group-hover:text-blue-300 font-medium shrink-0">
                                            <span>{isSelected ? "Open in Stage" : "View"}</span>
                                            <ArrowUpRight className="h-3 w-3" />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}

                              {/* Final Answer / Error */}
                              {msg.status === "error" && !msg.finalAnswer ? (
                                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                                  <span>Task execution encountered an error.</span>
                                </div>
                              ) : msg.finalAnswer ? (
                                <div className="text-foreground/90 leading-relaxed text-xs pt-1">
                                  <MarkdownPreview content={msg.finalAnswer} />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.2s]" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.4s]" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Floating Input Dock */}
                  <div className="p-4 bg-gradient-to-t from-background via-background/90 to-transparent shrink-0">
                    <Chat
                      onSubmit={handleTaskSubmit}
                      isLoading={isLoading}
                      lastUsage={currentUsage}
                      memory={activeConvMemory}
                    />
                  </div>
                </div>

              {/* Right Column: Live Artifact Stage (Split View) */}
              <div className={`hidden lg:flex flex-col h-full transition-all duration-300 ${previewFilePath ? "w-[48%] xl:w-[52%] rounded-2xl border border-border/40 overflow-hidden bg-background shadow-xs" : "w-0 border-0 overflow-hidden"}`}>
                <StagePanel
                  filePath={previewFilePath}
                  onClose={() => setPreviewFilePath(null)}
                />
              </div>
            </div>

            {/* Fallback Drawer for Mobile / Small Screens */}
            <div className="lg:hidden">
              <FilePreviewDrawer
                filePath={previewFilePath}
                isOpen={Boolean(previewFilePath)}
                onClose={() => setPreviewFilePath(null)}
              />
            </div>
          </div>
          );
}

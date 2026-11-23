"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Context } from "@/components/Context";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { BrainCircuit } from "lucide-react";
import { TokenUsage } from "@/lib/api";

interface ChatProps {
  onSubmit: (task: string) => void;
  isLoading: boolean;
  lastUsage?: TokenUsage;
  memory?: string;
}

export function Chat({ onSubmit, isLoading, lastUsage, memory }: ChatProps) {
  const [input, setInput] = React.useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    const task = input.trim();
    setInput("");
    onSubmit(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl bg-card/70 backdrop-blur-md p-3 shadow-2xl transition-all"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Deskie to build, debug, or run code in Docker..."
          rows={2}
          className="min-h-[48px] max-h-36 resize-none border-0 bg-transparent px-2 py-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0 text-sm placeholder:text-muted-foreground/60 leading-relaxed font-sans shadow-none outline-none ring-0"
        />

        <div className="flex items-center justify-between pt-2 px-1">
          <div className="flex items-center gap-2">
            <Context usage={lastUsage} />

            {memory && memory.trim().length > 0 && (
              <HoverCard>
                <HoverCardTrigger className="inline-flex">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-[11px] font-medium text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all cursor-pointer"
                  >
                    <BrainCircuit className="h-3 w-3 text-blue-400" />
                    <span>Memory</span>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent
                  side="top"
                  align="start"
                  className="w-80 p-3.5 bg-neutral-950/95 backdrop-blur-md border border-white/[0.08] shadow-2xl rounded-xl text-xs font-sans"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-blue-300 pb-1.5 mb-1.5 border-b border-white/[0.08]">
                    <BrainCircuit className="h-4 w-4 text-blue-400" />
                    <span>Compressed Working Memory</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                    Key points retained across turns to keep reasoning razor sharp:
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px] text-neutral-200">
                    {memory
                      .split("\n")
                      .filter((l) => l.trim().length > 0)
                      .map((line, idx) => (
                        <div key={idx} className="leading-snug text-neutral-300 flex items-start gap-1.5">
                          <span className="text-blue-400 shrink-0">•</span>
                          <span>{line.replace(/^-\s*/, "")}</span>
                        </div>
                      ))}
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-sm px-4 font-medium transition-all bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-600/40 disabled:text-white/50 cursor-pointer"
            >
              {isLoading ? (
                <span>Thinking...</span>
              ) : (
                <span>Send</span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

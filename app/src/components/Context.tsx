"use client";

import * as React from "react";
import { Zap } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { TokenUsage } from "@/lib/api";

interface ContextProps {
  usage?: TokenUsage;
}

export function Context({ usage }: ContextProps) {
  const limit = usage?.limit || 128000;
  const inputTokens = usage?.prompt_tokens || 0;
  const outputTokens = usage?.completion_tokens || 0;
  const totalTokens = usage?.total_tokens || inputTokens + outputTokens;

  const percent = Math.min(100, Math.max(1, Math.round((totalTokens / limit) * 100)));

  const formatK = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  return (
    <HoverCard>
      <HoverCardTrigger className="inline-flex">
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/70 hover:bg-secondary text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer border border-border/40"
        >
          <Zap className="h-3 w-3 text-amber-400 fill-amber-400/20" />
          <span>{totalTokens > 0 ? `${percent}% context` : "Context"}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="flex w-64 flex-col gap-3 p-3.5 bg-card/95 backdrop-blur-md border-border/80 shadow-xl rounded-xl font-sans"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Context Window</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatK(totalTokens)} / {formatK(limit)}
          </span>
        </div>

        <Progress value={percent} className="h-1.5 bg-secondary" />

        <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex justify-between items-center">
            <span>Input Tokens</span>
            <span className="font-mono text-foreground/80">{inputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Output Tokens</span>
            <span className="font-mono text-foreground/80">{outputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center font-medium text-foreground pt-1 border-t border-border/20">
            <span>Remaining</span>
            <span className="font-mono text-emerald-400">
              {Math.max(0, limit - totalTokens).toLocaleString()}
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

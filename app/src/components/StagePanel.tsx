"use client";

import * as React from "react";
import {
  X,
  Play,
  Code2,
  Copy,
  Check,
  RotateCw,
  ExternalLink,
  Globe,
  Loader2,
  AlertCircle,
  FileCode,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { fetchFileContent, FileContentResponse } from "@/lib/api";

interface StagePanelProps {
  filePath: string | null;
  onClose: () => void;
  className?: string;
}

export function StagePanel({ filePath, onClose, className = "" }: StagePanelProps) {
  const [data, setData] = React.useState<FileContentResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"preview" | "code">("preview");
  const [isCopied, setIsCopied] = React.useState(false);
  const [iframeKey, setIframeKey] = React.useState(0);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const loadFile = React.useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFileContent(path);
      setData(res);
      setViewMode(res.is_html ? "preview" : "code");
    } catch (err: any) {
      setError(err.message || "Failed to load file content.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    } else {
      setData(null);
      setError(null);
    }
  }, [filePath, loadFile]);

  const handleCopy = () => {
    if (!data?.content) return;
    navigator.clipboard.writeText(data.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  if (!filePath) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground/60 select-none ${className}`}>
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-3">
          <Code2 className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-xs font-semibold text-foreground/80 tracking-tight">Stage & Live Artifacts</h3>
        <p className="text-[11px] text-muted-foreground/70 max-w-xs mt-1 leading-relaxed">
          When the agent generates code, creates files, or builds HTML prototypes, they appear here live.
        </p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-[#111215] border-l border-white/[0.07] ${className}`}>
      {/* Stage Header */}
      <div className="h-12 px-3.5 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-white/[0.015]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            {data?.is_html ? <Globe className="h-3.5 w-3.5" /> : <FileCode className="h-3.5 w-3.5" />}
          </div>
          <span className="text-xs font-mono font-medium text-foreground truncate">{filePath}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {data?.is_html && (
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/[0.06] mr-1">
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "preview"
                    ? "bg-white/[0.1] text-white"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Play className="h-3 w-3" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "code"
                    ? "bg-white/[0.1] text-white"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Code2 className="h-3 w-3" />
                <span>Code</span>
              </button>
            </div>
          )}

          {viewMode === "preview" && data?.is_html && (
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors"
              title="Reload preview"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors"
            title="Copy content"
          >
            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors"
            title="Close stage"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stage Body */}
      <div className="flex-1 relative overflow-hidden bg-[#0d0e11]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="p-6 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        ) : viewMode === "preview" && data?.is_html ? (
          <iframe
            key={iframeKey}
            srcDoc={data.preview_html || data.content}
            sandbox="allow-scripts allow-modals allow-same-origin"
            className="w-full h-full border-0 bg-white"
            title="Artifact Preview"
          />
        ) : (
          <pre className="p-4 text-xs font-mono text-neutral-200 overflow-auto h-full leading-relaxed select-text">
            <code>{data?.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

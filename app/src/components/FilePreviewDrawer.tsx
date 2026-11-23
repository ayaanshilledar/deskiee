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
  FileCode,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { fetchFileContent, FileContentResponse } from "@/lib/api";

interface FilePreviewDrawerProps {
  filePath: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreviewDrawer({
  filePath,
  isOpen,
  onClose,
}: FilePreviewDrawerProps) {
  const [data, setData] = React.useState<FileContentResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"preview" | "code">("preview");
  const [isCopied, setIsCopied] = React.useState(false);
  const [iframeKey, setIframeKey] = React.useState(0);

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
    if (isOpen && filePath) {
      loadFile(filePath);
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, filePath, loadFile]);

  // Handle ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = () => {
    if (!data?.content) return;
    navigator.clipboard.writeText(data.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRefreshPreview = () => {
    setIframeKey((prev) => prev + 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-[700px] h-full bg-[#121316]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out animate-in slide-in-from-right">
        {/* Drawer Header */}
        <header className="h-14 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              {data?.is_html ? (
                <Globe className="h-4 w-4" />
              ) : (
                <FileCode className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-semibold tracking-tight text-foreground truncate">
                {filePath || "File Preview"}
              </h2>
              <span className="text-[10px] text-muted-foreground font-mono block leading-none mt-0.5">
                workspace/{filePath}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher (if HTML) */}
            {data?.is_html && (
              <div className="flex items-center bg-white/[0.05] p-0.5 rounded-lg border border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    viewMode === "preview"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Play className="h-3 w-3" />
                  <span>Live Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("code")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    viewMode === "code"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code2 className="h-3 w-3" />
                  <span>Code</span>
                </button>
              </div>
            )}

            {/* Action buttons */}
            {viewMode === "preview" && data?.is_html && (
              <button
                type="button"
                onClick={handleRefreshPreview}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                title="Reload Preview"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
              title="Copy code"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors ml-1"
              title="Close drawer (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Drawer Body */}
        <div className="flex-1 overflow-hidden relative bg-black/40">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              <span>Loading workspace file...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center text-xs text-red-400">
              <AlertCircle className="h-6 w-6 text-red-400/80" />
              <span className="font-medium">Failed to preview file</span>
              <span className="text-muted-foreground max-w-sm">{error}</span>
            </div>
          ) : data ? (
            viewMode === "preview" && data.is_html ? (
              /* Live Sandboxed HTML Preview */
              <div className="w-full h-full p-3 bg-neutral-950 flex flex-col">
                <div className="w-full h-full rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl bg-white">
                  <iframe
                    key={iframeKey}
                    sandbox="allow-scripts allow-modals"
                    srcDoc={data.preview_html || data.content}
                    title={data.path}
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            ) : (
              /* Syntax Code Viewer */
              <div className="w-full h-full overflow-auto p-4 font-mono text-[12px] leading-relaxed text-neutral-200">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.06] text-[11px] text-muted-foreground font-sans">
                  <span>{data.content.split("\n").length} lines</span>
                  <span>{data.content.length} characters</span>
                </div>
                <pre className="overflow-x-auto whitespace-pre">
                  <code>{data.content}</code>
                </pre>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

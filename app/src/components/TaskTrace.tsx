"use client";

import * as React from "react";
import {
  FileCode2,
  Terminal,
  CheckCircle2,
  ChevronDown,
  Loader2,
  AlertCircle,
  FileSearch,
  Trash2,
  Code2,
  Search,
  FolderSearch,
  GitCommit,
  GitCompare,
  RotateCcw,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface TaskStep {
  id: string;
  type:
    | "write_file"
    | "run_command"
    | "read_file"
    | "list_files"
    | "delete_file"
    | "grep_search"
    | "file_search"
    | "git_checkpoint"
    | "git_diff"
    | "git_rollback"
    | "iteration";
  title: string;
  details?: string;
  output?: string;
  exitCode?: number;
  status: "running" | "completed" | "error";
}

interface TaskTraceProps {
  status: "idle" | "running" | "completed" | "error";
  iterations: number;
  logs: string[];
  onPreviewFile?: (path: string) => void;
}

export function parseLogsToSteps(logs: string[], overallStatus: string): TaskStep[] {
  const steps: TaskStep[] = [];
  let currentStep: Partial<TaskStep> | null = null;

  for (let i = 0; i < logs.length; i++) {
    const line = logs[i];

    if (line.startsWith("Action: ")) {
      if (currentStep && currentStep.title) {
        steps.push(currentStep as TaskStep);
      }

      const actionText = line.replace("Action: ", "");
      const parenIdx = actionText.indexOf("(");
      if (parenIdx !== -1 && actionText.endsWith(")")) {
        const type = actionText.slice(0, parenIdx).trim() as TaskStep["type"];
        const rawArgs = actionText.slice(parenIdx + 1, -1).trim();

        let args: any = {};
        try {
          args = JSON.parse(rawArgs.replace(/'/g, '"'));
        } catch {
          args = {};
        }
        let title = `${type}`;
        let details = "";

        if (type === "write_file") {
          title = `Saved ${args.path || "file"}`;
          details = args.path || "";
        } else if (type === "run_command") {
          title = `Executed \`${args.command || "command"}\``;
          details = args.command || "";
        } else if (type === "read_file") {
          title = `Inspected ${args.path || "file"}`;
          details = args.path || "";
        } else if (type === "list_files") {
          title = "Scanned workspace files";
        } else if (type === "delete_file") {
          title = `Deleted ${args.path || "file"}`;
        } else if (type === "grep_search") {
          title = `Searched for "${args.query || "pattern"}"`;
          details = args.path || "";
        } else if (type === "file_search") {
          title = `Found files matching "${args.pattern || "*"}"`;
          details = args.directory || "";
        } else if (type === "git_checkpoint") {
          title = `Git Checkpoint: "${args.message || "Checkpoint"}"`;
        } else if (type === "git_diff") {
          title = "Inspected git diff";
        } else if (type === "git_rollback") {
          title = `Git Rollback to ${args.target || "HEAD"}`;
        }

        currentStep = {
          id: `step-${i}`,
          type,
          title,
          details,
          status: "running",
        };
      }
    } else if (line.startsWith("Observation: ") && currentStep) {
      const obs = line.replace("Observation: ", "");
      currentStep.output = obs;

      let isError = false;
      if (/exit code:\s*[1-9]/i.test(obs)) {
        isError = true;
      } else if (obs.startsWith("Error:") || obs.includes("Sandbox execution error:") || obs.includes("Failed to start")) {
        isError = true;
      } else if (/exit code:\s*0/i.test(obs)) {
        isError = false;
      } else if (obs.toLowerCase().includes("failed") && !obs.includes("0 failed")) {
        isError = true;
      }

      currentStep.status = isError ? "error" : "completed";
      steps.push(currentStep as TaskStep);
      currentStep = null;
    }
  }

  if (currentStep && currentStep.title) {
    if (overallStatus === "completed") {
      currentStep.status = "completed";
    }
    steps.push(currentStep as TaskStep);
  }

  return steps;
}

export function TaskTrace({ status, iterations, logs, onPreviewFile }: TaskTraceProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [expandedOutputId, setExpandedOutputId] = React.useState<string | null>(null);
  const [activeStageIndex, setActiveStageIndex] = React.useState(0);

  const steps = React.useMemo(() => parseLogsToSteps(logs, status), [logs, status]);

  const isRunning = status === "running";

  // Dynamic cloud agent stage progression while waiting for initial response
  React.useEffect(() => {
    if (!isRunning || steps.length > 0) return;
    const stages = [0, 1, 2, 3];
    const timer = setInterval(() => {
      setActiveStageIndex((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(timer);
  }, [isRunning, steps.length]);

  if (status === "idle" && logs.length === 0) return null;

  const completedCount = steps.filter((s) => s.status === "completed").length;

  const liveExecutionStages = [
    { title: "Verifying warm Docker sandbox", subtitle: "Active container: deskie-active-sandbox" },
    { title: "Mounting workspace volume", subtitle: "Checking write permissions & git index" },
    { title: "Analyzing prompt & reasoning", subtitle: "Selecting tool execution strategy" },
    { title: "Dispatching instructions to agent", subtitle: "Awaiting tool execution output..." }
  ];

  return (
    <div className="w-full my-2 font-sans">
      {/* Sleek minimal Task line */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between py-2 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.06] cursor-pointer transition-all text-xs"
      >
        <div className="flex items-center gap-2.5">
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
          ) : status === "error" ? (
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
          )}

          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground/90">
              {isRunning
                ? steps.length > 0
                  ? `Executing: ${steps[steps.length - 1].title}`
                  : liveExecutionStages[activeStageIndex].title
                : status === "error"
                ? "Tasks halted with error"
                : `Completed ${steps.length || iterations} tasks`}
            </span>

            {steps.length > 0 && (
              <span className="text-muted-foreground/60 text-[11px] font-mono">
                ({completedCount}/{steps.length})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors">
          <span className="text-[11px] font-medium hidden sm:inline">
            {isOpen ? "Hide details" : "View steps"}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Expanded Step Timeline (shadcn Task/Trace pattern) */}
      {isOpen && (
        <div className="mt-2 ml-3.5 pl-3 border-l border-white/[0.08] space-y-2.5 py-1">
          {steps.length === 0 ? (
            <div className="space-y-2 py-1 font-mono text-[11px]">
              {liveExecutionStages.map((stage, idx) => {
                const isCurrent = idx === activeStageIndex;
                const isPassed = idx < activeStageIndex;
                return (
                  <div key={idx} className="flex items-start gap-2.5">
                    {isPassed ? (
                      <span className="text-emerald-400 mt-0.5 text-xs">✓</span>
                    ) : isCurrent ? (
                      <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping mt-1.5 shrink-0" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/20 mt-1.5 shrink-0" />
                    )}
                    <div>
                      <span className={isCurrent ? "text-foreground font-medium" : isPassed ? "text-muted-foreground/90" : "text-muted-foreground/40"}>
                        {stage.title}
                      </span>
                      {isCurrent && (
                        <div className="text-[10px] text-muted-foreground/60 leading-tight">
                          {stage.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            steps.map((step) => {
              const hasOutput = Boolean(step.output);
              const isOutputOpen = expandedOutputId === step.id;

              return (
                <div key={step.id} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {step.type === "write_file" && (
                        <FileCode2 className="h-3.5 w-3.5 text-primary" />
                      )}
                      {step.type === "run_command" && (
                        <Terminal className="h-3.5 w-3.5 text-blue-400" />
                      )}
                      {step.type === "read_file" && (
                        <FileSearch className="h-3.5 w-3.5 text-amber-400" />
                      )}
                      {step.type === "list_files" && (
                        <FolderSearch className="h-3.5 w-3.5 text-purple-400" />
                      )}
                      {step.type === "delete_file" && (
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      )}
                      {step.type === "grep_search" && (
                        <Search className="h-3.5 w-3.5 text-sky-400" />
                      )}
                      {step.type === "file_search" && (
                        <FolderSearch className="h-3.5 w-3.5 text-indigo-400" />
                      )}
                      {step.type === "git_checkpoint" && (
                        <GitCommit className="h-3.5 w-3.5 text-sky-400" />
                      )}
                      {step.type === "git_diff" && (
                        <GitCompare className="h-3.5 w-3.5 text-cyan-400" />
                      )}
                      {step.type === "git_rollback" && (
                        <RotateCcw className="h-3.5 w-3.5 text-orange-400" />
                      )}

                      <span className="font-medium text-foreground/90">
                        {step.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasOutput && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedOutputId(isOutputOpen ? null : step.id);
                          }}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary transition-colors"
                        >
                          <Code2 className="h-3 w-3" />
                          <span>{isOutputOpen ? "Hide" : "Output"}</span>
                        </button>
                      )}

                      {step.status === "completed" && (
                        <span className="text-[10px] font-mono text-blue-400/90">
                          done
                        </span>
                      )}
                      {step.status === "running" && (
                        <span className="text-[10px] font-mono text-blue-400 animate-pulse">
                          active
                        </span>
                      )}
                      {step.status === "error" && (
                        <span className="text-[10px] font-mono text-red-400">
                          error
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Step Output */}
                  {hasOutput && isOutputOpen && (
                    <div className="ml-5 rounded-lg bg-neutral-950 p-2.5 font-mono text-[11px] text-neutral-300 border border-border/40 overflow-x-auto shadow-inner leading-relaxed whitespace-pre-wrap">
                      {step.output}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

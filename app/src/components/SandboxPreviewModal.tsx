"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Terminal,
  Cpu,
  Box,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Workflow,
  Sparkles,
  ArrowDown,
  ChevronDown,
} from "lucide-react";
import { parseLogsToSteps, TaskStep } from "./TaskTrace";

interface SandboxPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "idle" | "running" | "completed" | "error";
  logs: string[];
  iterations: number;
}

const FLOW_STAGES = [
  {
    id: "orch",
    stepNum: "01",
    label: "User Request Ingestion",
    icon: Sparkles,
    desc: "Prompt intake, active conversation memory retrieval & token budget check",
    systemRole: "Client / Orchestrator Layer",
  },
  {
    id: "brain",
    stepNum: "02",
    label: "LLM Reasoning & Strategy",
    icon: Cpu,
    desc: "Brain evaluates tool registry, context state & decides targeted tool call",
    systemRole: "Inference Engine",
  },
  {
    id: "harness",
    stepNum: "03",
    label: "Harness Validation & Serialization",
    icon: Layers,
    desc: "Validates schema args, paths, safety restrictions & prepares execution payload",
    systemRole: "Runtime Tool Harness",
  },
  {
    id: "sandbox",
    stepNum: "04",
    label: "Docker Sandbox Execution",
    icon: Box,
    desc: "Executes isolated commands, file writes, tests, or bash operations inside container",
    systemRole: "Isolated Container (deskie-active-sandbox)",
  },
  {
    id: "verify",
    stepNum: "05",
    label: "Observation Feedback Loop",
    icon: CheckCircle2,
    desc: "Captures stdout/stderr, verifies exit codes, and passes result to agent memory",
    systemRole: "Telemetry & Observation",
  },
];

export function SandboxPreviewModal({
  isOpen,
  onClose,
  status,
  logs,
  iterations,
}: SandboxPreviewModalProps) {
  const steps = React.useMemo(() => parseLogsToSteps(logs, status), [logs, status]);
  const isRunning = status === "running";
  const [expandedStepId, setExpandedStepId] = React.useState<string | null>(null);

  // Determine which pipeline stage is currently active
  const activePipelineStage = React.useMemo(() => {
    if (!isRunning && steps.length === 0) return 0;
    if (status === "completed") return 4;
    if (status === "error") return 3;
    if (steps.length === 0) return 1; // Brain reasoning initially
    const latest = steps[steps.length - 1];
    if (latest.status === "running") return 3; // Executing in sandbox
    return 2; // Harness processing
  }, [isRunning, status, steps]);

  const latestStep = steps.length > 0 ? steps[steps.length - 1] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
          />

          {/* Right Sliding Drawer */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-14 pointer-events-none">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-screen max-w-xl h-full bg-[#0c0d10] border-l border-white/[0.1] shadow-2xl flex flex-col pointer-events-auto text-neutral-100"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                      Sandbox Execution Flow
                      {isRunning && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          Live Stream
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Vertical breakdown of data flow, sandbox operations & container commands
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Active / Current Sandbox Command Focus Card */}
                <div className="p-4 rounded-xl border border-white/[0.08] bg-black/50 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-blue-400" />
                      <span>Active Sandbox Target</span>
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/70">
                      Container: deskie-active-sandbox
                    </span>
                  </div>

                  {latestStep ? (
                    <div className="space-y-2 pt-0.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px]">
                          {latestStep.type}
                        </span>
                        <span className="text-neutral-200 font-medium truncate">
                          {latestStep.title}
                        </span>
                      </div>

                      {latestStep.details && (
                        <div className="p-2.5 rounded-lg bg-black/70 border border-white/[0.06] font-mono text-xs text-blue-200 overflow-x-auto whitespace-pre-wrap break-all">
                          <span className="text-muted-foreground select-none">$ </span>
                          {latestStep.details}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground/70 italic py-1">
                      {isRunning
                        ? "Awaiting command dispatch from tool harness..."
                        : "No commands currently running."}
                    </div>
                  )}
                </div>

                {/* Vertical Top-to-Bottom Pipeline Flow */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    <span>Pipeline Stages (Top to Bottom Flow)</span>
                    <span className="text-[10px] font-mono text-blue-400/90">
                      Stage {activePipelineStage + 1} of {FLOW_STAGES.length}
                    </span>
                  </div>

                  <div className="relative flex flex-col space-y-0">
                    {FLOW_STAGES.map((stg, idx) => {
                      const Icon = stg.icon;
                      const isPassed = idx < activePipelineStage;
                      const isCurrent = idx === activePipelineStage;
                      const isLast = idx === FLOW_STAGES.length - 1;

                      return (
                        <div key={stg.id} className="relative flex flex-col">
                          {/* Stage Node Box */}
                          <div
                            className={`relative flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                              isCurrent
                                ? "bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/10 z-10"
                                : isPassed
                                ? "bg-white/[0.03] border-emerald-500/30 text-neutral-300"
                                : "bg-white/[0.015] border-white/[0.06] text-muted-foreground/60"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isCurrent
                                  ? "bg-blue-500/20 text-blue-400"
                                  : isPassed
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-white/[0.04] text-muted-foreground/50"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-xs font-semibold tracking-tight ${
                                    isCurrent
                                      ? "text-blue-300 font-bold"
                                      : isPassed
                                      ? "text-white"
                                      : "text-muted-foreground/80"
                                  }`}
                                >
                                  {stg.stepNum}. {stg.label}
                                </span>

                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-muted-foreground shrink-0">
                                  {stg.systemRole}
                                </span>
                              </div>

                              <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-1">
                                {stg.desc}
                              </p>

                              {/* If this is the active Docker sandbox stage, showcase active step */}
                              {isCurrent && stg.id === "sandbox" && latestStep && (
                                <div className="mt-2.5 p-2 rounded-lg bg-black/60 border border-blue-500/30 text-[11px] font-mono text-blue-300 flex items-center gap-2">
                                  <Terminal className="h-3 w-3 text-blue-400 shrink-0" />
                                  <span className="truncate">
                                    Executing: {latestStep.details || latestStep.title}
                                  </span>
                                </div>
                              )}
                            </div>

                            {isCurrent && (
                              <div className="shrink-0 pt-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Downward Connector Arrow */}
                          {!isLast && (
                            <div className="flex items-center justify-center py-1">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-[1.5px] h-3 transition-colors ${
                                    isPassed || isCurrent ? "bg-blue-500/40" : "bg-white/[0.08]"
                                  }`}
                                />
                                <ArrowDown
                                  className={`h-3.5 w-3.5 transition-colors -my-1 ${
                                    isPassed || isCurrent ? "text-blue-400" : "text-white/20"
                                  }`}
                                />
                                <div
                                  className={`w-[1.5px] h-3 transition-colors ${
                                    isPassed ? "bg-blue-500/40" : "bg-white/[0.08]"
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Executed Steps History Trace */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Executed Command History ({steps.length})</span>
                    <span>Turns / Iterations: {iterations}</span>
                  </div>

                  {steps.length === 0 ? (
                    <div className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.015] text-center text-xs text-muted-foreground/70">
                      No commands executed for this turn yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {steps.map((step, idx) => {
                        const isExpanded = expandedStepId === step.id;
                        return (
                          <div
                            key={step.id || idx}
                            className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col gap-2 text-xs"
                          >
                            <div
                              onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                              className="flex items-center justify-between gap-2 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {step.status === "completed" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                ) : step.status === "error" ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                ) : (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 shrink-0" />
                                )}
                                <span className="font-mono text-[10px] text-muted-foreground/70">
                                  #{idx + 1}
                                </span>
                                <span className="font-medium text-neutral-200 truncate">
                                  {step.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-muted-foreground">
                                  {step.type}
                                </span>
                                {step.output && (
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                )}
                              </div>
                            </div>

                            {step.details && (
                              <div className="font-mono text-[11px] text-neutral-400 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/[0.04] truncate">
                                <span className="text-muted-foreground/60 select-none">$ </span>
                                {step.details}
                              </div>
                            )}

                            {step.output && isExpanded && (
                              <div className="font-mono text-[10px] text-muted-foreground/80 bg-black/60 px-2.5 py-1.5 rounded-lg border border-white/[0.04] max-h-32 overflow-y-auto whitespace-pre-wrap break-all mt-1">
                                {step.output}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Docker Sandbox Mounted</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

<div align="center">
  <img src="app/public/logo.png" alt="Deskie Logo" width="130" />
  <h1>Deskie</h1>
  <p><strong>Next-Gen Cloud-Native AI Coding Harness & Autonomous Runtime Engine</strong></p>
  <p><em>Where autonomous agents write, execute, test, and ship code at cloud scale.</em></p>
</div>

---

### The Vision

Software development should not be constrained to passive chatbots generating code in a vacuum. **Deskie** is built from the ground up as a cloud-native coding harness that bridges advanced LLM cognition with real, isolated execution environments.

It equips autonomous agents with shell access, surgical codebase navigation, rapid feedback loops, and warm containerized sandboxing—empowering agents to inspect, build, break, debug, and deliver production-ready systems autonomously.

---

### Key Highlights

- **Autonomous Decision Engine**: Agents inspect runtime results, catch tracebacks, analyze root causes, and heal failures dynamically.
- **Warm Containerized Sandboxes**: Micro-isolated execution runtimes engineered with warm-standby Docker instances for low-latency (`docker exec`) command runs with complete host boundary protection.
- **Mission Control UI**: A high-performance web dashboard featuring real-time event telemetry, tool execution streams, and interactive diff visualizers.
- **Safe State Checkpointing**: Integrated git checkpointing with instant diff verification and one-click rollback triggers to keep codebases regression-free.
- **Zero-Fluff Tooling**: Built-in structural search, fine-grained file operations, command execution, and extensible tool pipelines.

---

### In-Depth Architecture

```
+---------------------------------------------------------------------------------------+
|                                    CONTROL PLANE                                      |
|                                                                                       |
|   Next.js 16 (React 19, Motion, TailWind 4)                                           |
|   * Mission Control Dashboard          * Real-Time Event & Tool Feed Telemetry        |
|   * Interactive Diff Visualizers       * Session & Conversation Tree Selector         |
+-------------------------------------------+-------------------------------------------+
                                            |
                                  HTTP / SSE REST APIs
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                                 DESKIE HARNESS CORE                                   |
|                                                                                       |
|   FastAPI Orchestrator Layer                                                          |
|   +-------------------------------------------------------------------------------+   |
|   |  Agent Runner Lifecycle                                                       |   |
|   |  * Multi-Iteration Reasoning Loop (Prompt -> LLM -> Tool Dispatch -> Observ.) |   |
|   |  * Argument Sanitization & Malformed JSON Self-Repair                         |   |
|   |  * Token Consumption & Latency Telemetry Accounting                          |   |
|   +-------------------------------------------------------------------------------+   |
|                                     |                                 |               |
|                    Query / Response |            Execution Dispatch   |               |
|                                     v                                 v               |
|   +---------------------------------------+   +-----------------------------------+   |
|   | LLM Cognition Engine (Brain)          |   | Tool Execution Router             |   |
|   | * System Prompt Behavioral Guardrails |   | * File Tools (Read, Write, Edit)  |   |
|   | * Empirical Verification Policy       |   | * Navigation (Grep, Find, List)   |   |
|   | * Conversation History & Memory       |   | * Git Ops (Checkpoint, Rollback)  |   |
|   | * Dynamic Model Adapter Layer         |   | * Sandbox Exec Invoker            |   |
|   +---------------------------------------+   +-----------------+-----------------+   |
|                                                                 |                     |
+-----------------------------------------------------------------|---------------------+
                                                                  |
                                              docker exec RPC     |
                                                                  v
+---------------------------------------------------------------------------------------+
|                         CONTAINERIZED SANDBOX INFRASTRUCTURE                          |
|                                                                                       |
|   Warm Docker Standby Runtime (Container Name: deskie-active-sandbox)                |
|   +-------------------------------------------------------------------------------+   |
|   | Isolation Barrier:                                                            |   |
|   | * Memory Quota Capping (2GB Default Limit)                                    |   |
|   | * Zombie Process Reaper (--init signal trapping)                              |   |
|   | * Bound Workspace Volume (/workspace Mount)                                  |   |
|   | * Persistent Package State across Agent Steps                                 |   |
|   | * Ultra-fast Sub-50ms Command Latency via Persistent Container Worker         |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
                                            |
                                     State & Metrics
                                            v
+---------------------------------------------------------------------------------------+
|                              PERSISTENCE & DATA LAYER                                 |
|                                                                                       |
|   SQLite / Relational State Store                                                     |
|   * Tasks & Agent Run Logs             * Conversation Snapshots & Historical Turns    |
|   * Checkpointed Tree Deltas           * Structured Execution Audit Traces            |
+---------------------------------------------------------------------------------------+
```

#### 1. Control Plane (`app/`)
The frontend is built on Next.js 16 with React 19, delivering an operator dashboard. It manages active agent interactions, streams iteration-by-iteration tool invocations, renders diffs, and inspects agent reasoning.

#### 2. Harness Core & Brain (`server/harness/` & `server/brain/`)
The harness powers the iterative agent control loop:
- **Reasoning Loop**: Feeds user goals, accumulated system history, and compressed conversational memory into the LLM.
- **Fault-Tolerant Tool Invocation**: Automatically repairs and normalizes tool call arguments from varied provider outputs before execution.
- **Empirical Enforcement**: Directs the agent to validate all code via real runtime execution before concluding a task.

#### 3. Containerized Sandbox (`server/sandbox/`)
Unlike naive harnesses that suffer seconds of cold-start delay per command with `docker run --rm`, Deskie deploys an active, warm standby container:
- **Fast Execution**: Commands dispatch via `docker exec` directly into the warm environment in 20-50ms.
- **State Preservation**: Build caches, dependencies, and environment changes persist across iterative debugging steps.
- **Host Containment**: Capped resource consumption and sandboxed filesystem mounts ensure safe execution of untrusted agent-written code.

#### 4. Tooling System (`server/tools/`)
A structured collection of capabilities exposed via strict function calling:
- **Filesystem**: Atomic reads, edits, and file generation.
- **Code Navigation**: Pattern grep and structural file discovery across complex directory trees.
- **Git Checkpoints**: Instant snapshots before speculative changes, allowing zero-risk rollbacks when experiments fail.

#### 5. Data & Telemetry (`server/database/`)
All steps, tool execution inputs/outputs, conversation states, and token metrics are persistently tracked to provide auditable traces of agent actions.

---

<div align="center">
  <sub>Built for the autonomous engineering era.</sub>
</div>

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  limit?: number;
}

export interface TaskRequest {
  task: string;
  model: string;
  base_url?: string;
  max_iterations?: number;
  conversation_id?: string;
}

export interface TaskResponse {
  status: "completed" | "max_iterations_reached" | "failed";
  final_answer: string;
  iterations: number;
  logs: string[];
  run_id?: number;
  conversation_id?: string;
  conversation_memory?: string;
  usage?: TokenUsage;
}

export interface ConversationItem {
  id: string;
  title: string;
  memory: string;
  updated_at: string;
  run_count: number;
}

export interface ConversationRun {
  id: number;
  task: string;
  status: "completed" | "max_iterations_reached" | "failed" | "running";
  iterations: number;
  final_answer: string;
  logs: string[];
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  memory: string;
  created_at: string;
  updated_at: string;
  runs: ConversationRun[];
}

export async function fetchConversations(): Promise<ConversationItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/conversations`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.conversations || [];
  } catch (err) {
    console.warn("Backend not reachable for fetchConversations:", err);
    return [];
  }
}

export async function fetchConversationDetail(convId: string): Promise<ConversationDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(convId)}`);
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn("Backend not reachable for fetchConversationDetail:", err);
    return null;
  }
}

export async function createNewConversation(title?: string): Promise<{ id: string; title: string; memory: string }> {
  const res = await fetch(`${API_BASE}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title || "New Conversation" }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export interface RunHistoryItem {
  id: number;
  task: string;
  status: string;
  iterations: number;
  final_answer: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function runTask(payload: TaskRequest): Promise<TaskResponse> {
  const res = await fetch(`${API_BASE}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Unknown server error" }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export async function fetchHistory(): Promise<RunHistoryItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/history`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.runs || [];
  } catch (err) {
    console.warn("Backend not reachable for fetchHistory:", err);
    return [];
  }
}

export interface FileContentResponse {
  path: string;
  content: string;
  preview_html?: string;
  is_html: boolean;
}

export async function fetchFileContent(path: string): Promise<FileContentResponse> {
  const res = await fetch(`${API_BASE}/api/file?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to load file" }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

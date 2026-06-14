import type { CursorRuntime } from "./config.js";

export interface RecoverRunWorkerInput {
  runId: string;
  agentId: string;
  chatId: string;
  cwd: string;
  runtime: CursorRuntime;
  repoUrl?: string;
  repoRef?: string;
  /** Макс. время ожидания stream/wait (мс). */
  timeoutMs?: number;
}

export interface RecoverRunWorkerReply {
  text: string;
  agentId: string;
  runId: string;
  status: string;
  errorDetail?: string;
}

export type RecoverRunWorkerReason =
  | "not_found"
  | "cancelled"
  | "error"
  | "timeout"
  | "crashed"
  | "worker_error";

export interface RecoverRunWorkerOutput {
  ok: boolean;
  reason?: RecoverRunWorkerReason;
  reply?: RecoverRunWorkerReply;
  message?: string;
}

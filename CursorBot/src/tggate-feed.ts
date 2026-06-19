// Reader for the TGGate.Bridge message feed (local NDJSON file, no server / no native deps).
//
// The assistant bot (TGGate.Bridge) appends one JSON object per line to messages.ndjson in
// realtime. This module reads that file directly so CursorBot / scripts can search, fetch new
// messages, or filter by chat/group, then hand them to an LLM.
//
// Feed path resolution: env TGGATE_FEED_FILE, else the default local bridge path.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_FEED_FILE = "C:/tsroot/TGGate/data/bridge-local/feed/messages.ndjson";

export interface FeedMessage {
  /** Monotonic id (DB rowid). Use it as the cursor for getNewMessages. */
  id: number;
  /** ISO-8601 UTC timestamp. */
  ts: string;
  /** "tg->sm" (incoming from Telegram) or "sm->tg" (sent out via the bot). */
  direction: "tg->sm" | "sm->tg" | string;
  peerId: number | null;
  /** "user" | "bot" | "group" | "channel" | null */
  peerKind: string | null;
  peerTitle: string | null;
  peerUsername: string | null;
  smChatId: string | null;
  tgMsgId: number | null;
  smMsgId: string | null;
  sender: string | null;
  text: string | null;
  contentType: string | null;
  hasMedia: boolean;
}

export interface ChatFilter {
  /** Match by Telegram peer id. */
  peerId?: number;
  /** Match by @username (case-insensitive, leading @ optional). */
  username?: string;
}

export function resolveFeedPath(): string {
  const fromEnv = process.env.TGGATE_FEED_FILE?.trim();
  return resolve(fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_FEED_FILE);
}

/** Reads and parses the whole feed. Malformed lines are skipped. */
export function readAll(feedPath: string = resolveFeedPath()): FeedMessage[] {
  if (!existsSync(feedPath)) return [];
  const raw = readFileSync(feedPath, "utf8");
  const out: FeedMessage[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as FeedMessage);
    } catch {
      /* skip partial / malformed line (e.g. last line during a concurrent write) */
    }
  }
  return out;
}

/** Messages with id greater than `afterId` (the polling cursor). */
export function getNewMessages(afterId: number, feedPath?: string): FeedMessage[] {
  return readAll(feedPath).filter((m) => typeof m.id === "number" && m.id > afterId);
}

/** Latest `n` messages (most recent last). */
export function tail(n = 20, feedPath?: string): FeedMessage[] {
  const all = readAll(feedPath);
  return n > 0 ? all.slice(-n) : all;
}

/** Case-insensitive substring search over text/sender/peer. */
export function search(
  query: string,
  opts: { limit?: number; chat?: ChatFilter } = {},
  feedPath?: string,
): FeedMessage[] {
  const q = query.trim().toLowerCase();
  let res = readAll(feedPath);
  if (opts.chat) res = res.filter((m) => matchesChat(m, opts.chat!));
  if (q) {
    res = res.filter((m) =>
      [m.text, m.sender, m.peerTitle, m.peerUsername]
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }
  return opts.limit && opts.limit > 0 ? res.slice(-opts.limit) : res;
}

/** All messages from a specific chat/group (by peerId or @username). */
export function getByChat(
  chat: ChatFilter | string | number,
  opts: { limit?: number } = {},
  feedPath?: string,
): FeedMessage[] {
  const filter = normalizeChat(chat);
  const res = readAll(feedPath).filter((m) => matchesChat(m, filter));
  return opts.limit && opts.limit > 0 ? res.slice(-opts.limit) : res;
}

/** Highest id currently in the feed (0 if empty) — handy to initialize a poll cursor. */
export function latestId(feedPath?: string): number {
  const all = readAll(feedPath);
  return all.length ? all[all.length - 1].id : 0;
}

function normalizeChat(chat: ChatFilter | string | number): ChatFilter {
  if (typeof chat === "number") return { peerId: chat };
  if (typeof chat === "string") return { username: chat };
  return chat;
}

function matchesChat(m: FeedMessage, f: ChatFilter): boolean {
  if (f.peerId != null && m.peerId !== f.peerId) return false;
  if (f.username != null) {
    const u = f.username.replace(/^@/, "").toLowerCase();
    if ((m.peerUsername ?? "").toLowerCase() !== u) return false;
  }
  return true;
}

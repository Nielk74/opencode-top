import Database from "better-sqlite3";
import { TokenUsage, type Session, type Interaction, type MessagePart } from "../core/types";
import * as os from "node:os";
import * as path from "node:path";

interface DbSession {
  id: string;
  parent_id: string | null;
  project_id: string | null;
  title: string | null;
  time_created: number | null;
  time_archived: number | null;
  project_name: string | null;
}

interface DbMessage {
  id: string;
  session_id: string;
  data: string;
  time_created: number;
}

interface DbPart {
  message_id: string;
  session_id: string;
  data: string;
}

// Real message.data schema from OpenCode
interface RealMessageData {
  id?: string;
  parentID?: string;
  role?: "assistant" | "user";
  agent?: string;
  mode?: string;
  modelID?: string;
  providerID?: string;
  time?: {
    created?: number;
    completed?: number;
  };
  tokens?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: {
      read?: number;
      write?: number;
    };
  };
  cost?: number;
  finish?: string;
  // Legacy fields (older messages may still have these)
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_write_input_tokens?: number;
  };
  model?: string;
  stop_reason?: string;
}

// Real part.data schema from OpenCode
interface RealPartData {
  type?: string;
  text?: string;
  time?: {
    start?: number;
    end?: number;
  };
  // tool call fields
  callID?: string;
  tool?: string;
  state?: {
    status?: string;
    input?: Record<string, unknown>;
    output?: string;
    title?: string;
    time?: {
      start?: number;
      end?: number;
    };
    metadata?: {
      exit?: number;
      exitCode?: number;
      truncated?: boolean;
    };
  };
  // patch fields
  hash?: string;
  files?: string[];
}

export function getDbPath(): string {
  return path.join(os.homedir(), ".local", "share", "opencode", "opencode.db");
}

export function loadSessions(dbPath: string = getDbPath()): Session[] {
  const db = new Database(dbPath, { readonly: true });

  const sessions = db
    .prepare(`
    SELECT
      s.id, s.parent_id, s.project_id, s.title,
      s.time_created, s.time_archived,
      p.name as project_name
    FROM session s
    LEFT JOIN project p ON s.project_id = p.id
    ORDER BY s.time_created DESC
  `)
    .all() as DbSession[];

  const sessionIds = sessions.map((s) => s.id);
  const interactions = loadInteractions(db, sessionIds);
  db.close();

  return sessions.map((s) => ({
    id: s.id,
    parentId: s.parent_id,
    projectId: s.project_id,
    projectName: s.project_name,
    title: s.title,
    timeCreated: s.time_created,
    timeArchived: s.time_archived,
    interactions: interactions.get(s.id) ?? [],
    source: "sqlite" as const,
  }));
}

function loadInteractions(
  db: Database.Database,
  sessionIds: string[]
): Map<string, Interaction[]> {
  const result = new Map<string, Interaction[]>();

  if (sessionIds.length === 0) return result;

  const placeholders = sessionIds.map(() => "?").join(",");

  const messages = db
    .prepare(`
    SELECT id, session_id, data, time_created
    FROM message
    WHERE session_id IN (${placeholders})
    ORDER BY time_created ASC
  `)
    .all(...sessionIds) as DbMessage[];

  if (messages.length === 0) return result;

  // Load all parts for these messages in one batch
  const messageIds = messages.map((m) => m.id);
  const partsByMessageId = loadParts(db, messageIds);

  for (const msg of messages) {
    if (!result.has(msg.session_id)) {
      result.set(msg.session_id, []);
    }

    const parts = partsByMessageId.get(msg.id) ?? [];
    const parsed = parseMessageData(msg.data, msg.id, msg.session_id, msg.time_created, parts);
    if (parsed) {
      result.get(msg.session_id)!.push(parsed);
    }
  }

  return result;
}

function loadParts(db: Database.Database, messageIds: string[]): Map<string, MessagePart[]> {
  const result = new Map<string, MessagePart[]>();

  if (messageIds.length === 0) return result;

  // Check if part table exists
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='part'")
    .get();
  if (!tableExists) return result;

  const placeholders = messageIds.map(() => "?").join(",");
  let rows: DbPart[] = [];

  try {
    rows = db
      .prepare(`
      SELECT message_id, session_id, data
      FROM part
      WHERE message_id IN (${placeholders})
      ORDER BY rowid ASC
    `)
      .all(...messageIds) as DbPart[];
  } catch {
    // part table may have different schema
    return result;
  }

  for (const row of rows) {
    if (!result.has(row.message_id)) {
      result.set(row.message_id, []);
    }
    const part = parsePart(row.data);
    if (part) {
      result.get(row.message_id)!.push(part);
    }
  }

  return result;
}

function parsePart(data: string): MessagePart | null {
  try {
    const json = JSON.parse(data) as RealPartData;
    const timeStart = json.time?.start ?? 0;
    const timeEnd = json.time?.end ?? 0;

    switch (json.type) {
      case "text":
        return {
          type: "text",
          text: json.text ?? "",
          timeStart,
          timeEnd,
        };

      case "tool": {
        const state = json.state ?? {};
        const status = normalizeToolStatus(state.status);
        // Timing lives in state.time, not top-level time
        const toolTimeStart = state.time?.start ?? timeStart;
        const toolTimeEnd = state.time?.end ?? timeEnd;
        return {
          type: "tool",
          callId: json.callID ?? "",
          toolName: json.tool ?? "unknown",
          status,
          input: state.input ?? {},
          output: state.output ?? "",
          title: state.title ?? null,
          exitCode: state.metadata?.exit ?? state.metadata?.exitCode ?? null,
          truncated: state.metadata?.truncated ?? false,
          timeStart: toolTimeStart,
          timeEnd: toolTimeEnd,
        };
      }

      case "reasoning":
        return {
          type: "reasoning",
          text: json.text ?? "",
          timeStart,
          timeEnd,
        };

      case "patch":
        return {
          type: "patch",
          hash: json.hash ?? "",
          files: json.files ?? [],
        };

      default:
        return null;
    }
  } catch {
    return null;
  }
}

function normalizeToolStatus(status: string | undefined): "completed" | "pending" | "error" {
  if (status === "completed") return "completed";
  if (status === "error") return "error";
  return "pending";
}

function parseMessageData(
  data: string,
  messageId: string,
  sessionId: string,
  timeCreated: number,
  parts: MessagePart[]
): Interaction | null {
  try {
    const json = JSON.parse(data) as RealMessageData;

    // Support both new schema (tokens.*) and legacy schema (usage.*)
    const newTokens = json.tokens;
    const legacyUsage = json.usage ?? {};

    const input = newTokens?.input ?? legacyUsage.input_tokens ?? 0;
    const output = newTokens?.output ?? legacyUsage.output_tokens ?? 0;
    const cacheRead = newTokens?.cache?.read ?? legacyUsage.cache_read_input_tokens ?? 0;
    const cacheWrite = newTokens?.cache?.write ?? legacyUsage.cache_write_input_tokens ?? 0;
    const reasoning = newTokens?.reasoning ?? 0;

    const timeCompleted = json.time?.completed ?? null;
    const timeDelta =
      timeCompleted && json.time?.created
        ? (timeCompleted - json.time.created) / 1000
        : null;
    const outputRate =
      output > 0 && timeDelta && timeDelta > 0 ? output / timeDelta : 0;

    const role = json.role ?? "assistant";

    // Only include interactions that have meaningful data (assistant messages with tokens)
    if (role !== "assistant" && input === 0 && output === 0) return null;

    return {
      id: messageId,
      sessionId,
      modelId: normalizeModelName(json.modelID ?? json.model ?? "unknown"),
      providerId: json.providerID ?? null,
      role,
      tokens: new TokenUsage(input, output, cacheRead, cacheWrite, reasoning),
      time: {
        created: json.time?.created ?? timeCreated,
        completed: timeCompleted,
      },
      agent: json.agent ?? null,
      finishReason: json.finish ?? json.stop_reason ?? null,
      outputRate,
      parts,
    };
  } catch {
    return null;
  }
}

function normalizeModelName(model: string): string {
  return model
    .replace(/-\d{8}$/, "")
    .replace(/:/g, "-")
    .toLowerCase();
}

export function sessionExists(dbPath: string = getDbPath()): boolean {
  try {
    const db = new Database(dbPath, { readonly: true });
    db.prepare("SELECT 1 FROM session LIMIT 1").get();
    db.close();
    return true;
  } catch {
    return false;
  }
}

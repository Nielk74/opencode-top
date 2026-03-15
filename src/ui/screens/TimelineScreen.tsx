import React, { useState, useMemo, useCallback, memo } from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme";
import { StatusBar } from "../components/StatusBar";
import type { Workflow, Interaction, MessagePart } from "../../core/types";

interface TimelineScreenProps {
  workflows: Workflow[];
  isActive: boolean;
  contentHeight: number;
}

type TimelineLine =
  | { kind: "session-header"; sessionId: string; title: string; agent: string | null; time: number | null }
  | { kind: "interaction-header"; interactionId: string; modelId: string; time: number | null; agent: string | null }
  | { kind: "tool-call"; part: MessagePart & { type: "tool" }; interactionId: string }
  | { kind: "text-snippet"; text: string; interactionId: string }
  | { kind: "reasoning-snippet"; text: string; interactionId: string }
  | { kind: "spacer" };

function formatTime(ts: number | null): string {
  if (!ts) return "??:??";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function buildTimeline(workflows: Workflow[]): TimelineLine[] {
  const lines: TimelineLine[] = [];

  const allSessions = workflows.flatMap((w) => [
    w.mainSession,
    ...w.subAgentSessions,
  ]);

  // Sort by timeCreated
  allSessions.sort((a, b) => (a.timeCreated ?? 0) - (b.timeCreated ?? 0));

  for (const session of allSessions) {
    const agentName = session.interactions[0]?.agent ?? null;
    lines.push({
      kind: "session-header",
      sessionId: session.id,
      title: session.title ?? session.id.slice(0, 12),
      agent: agentName,
      time: session.timeCreated,
    });

    for (const interaction of session.interactions) {
      if (interaction.role !== "assistant") continue;

      lines.push({
        kind: "interaction-header",
        interactionId: interaction.id,
        modelId: interaction.modelId,
        time: interaction.time.created,
        agent: interaction.agent,
      });

      for (const part of interaction.parts) {
        if (part.type === "tool") {
          lines.push({
            kind: "tool-call",
            part: part as MessagePart & { type: "tool" },
            interactionId: interaction.id,
          });
        } else if (part.type === "text" && part.text.trim().length > 0) {
          lines.push({
            kind: "text-snippet",
            text: part.text.slice(0, 120).replace(/\n/g, " "),
            interactionId: interaction.id,
          });
        } else if (part.type === "reasoning" && part.text.trim().length > 0) {
          lines.push({
            kind: "reasoning-snippet",
            text: part.text.slice(0, 100).replace(/\n/g, " "),
            interactionId: interaction.id,
          });
        }
      }
    }

    lines.push({ kind: "spacer" });
  }

  return lines;
}

function renderLine(line: TimelineLine, idx: number): React.ReactElement {
  switch (line.kind) {
    case "session-header":
      return (
        <Box key={idx} flexDirection="row">
          <Text color={colors.accent} bold>
            ▶ {truncate(line.title, 40)}
          </Text>
          {line.agent && <Text color={colors.cyan}> [{line.agent}]</Text>}
          <Box flexGrow={1} />
          <Text color={colors.textDim}>{formatTime(line.time)}</Text>
        </Box>
      );

    case "interaction-header":
      return (
        <Box key={idx} flexDirection="row">
          <Text color={colors.textDim}>  </Text>
          <Text color={colors.purple}>◆ </Text>
          <Text color={colors.info}>{truncate(line.modelId, 30)}</Text>
          {line.agent && <Text color={colors.cyan}> [{line.agent}]</Text>}
          <Box flexGrow={1} />
          <Text color={colors.textDim}>{formatTime(line.time)}</Text>
        </Box>
      );

    case "tool-call": {
      const p = line.part;
      const statusIcon = p.status === "completed" ? "✓" : p.status === "error" ? "✗" : "◌";
      const statusColor =
        p.status === "completed" ? colors.success : p.status === "error" ? colors.error : colors.warning;
      const durationMs = p.timeEnd > 0 && p.timeStart > 0 ? p.timeEnd - p.timeStart : 0;
      const durationStr = durationMs > 0 ? ` ${(durationMs / 1000).toFixed(1)}s` : "";
      return (
        <Box key={idx} flexDirection="row">
          <Text color={colors.textDim}>    </Text>
          <Text color={statusColor}>{statusIcon} </Text>
          <Text color={colors.text}>{truncate(p.toolName, 20)}</Text>
          {p.title && <Text color={colors.textDim}> {truncate(p.title, 25)}</Text>}
          <Box flexGrow={1} />
          <Text color={colors.textDim}>{durationStr}</Text>
        </Box>
      );
    }

    case "text-snippet":
      return (
        <Box key={idx} flexDirection="row">
          <Text color={colors.textDim}>    │ </Text>
          <Text color={colors.text}>{truncate(line.text, 80)}</Text>
        </Box>
      );

    case "reasoning-snippet":
      return (
        <Box key={idx} flexDirection="row">
          <Text color={colors.textDim}>    ⚡ </Text>
          <Text color={colors.accentDim}>{truncate(line.text, 80)}</Text>
        </Box>
      );

    case "spacer":
      return <Box key={idx} />;
  }
}

function TimelineScreenInner({ workflows, isActive, contentHeight }: TimelineScreenProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const allLines = useMemo(() => buildTimeline(workflows), [workflows]);

  const visibleHeight = contentHeight - 4; // header row + status bar + borders

  const clampOffset = useCallback(
    (offset: number) => Math.max(0, Math.min(offset, Math.max(0, allLines.length - visibleHeight))),
    [allLines.length, visibleHeight]
  );

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        setScrollOffset((o) => clampOffset(o - 1));
        return;
      }
      if (key.downArrow || input === "j") {
        setScrollOffset((o) => clampOffset(o + 1));
        return;
      }
      if (input === "g") {
        setScrollOffset(0);
        return;
      }
      if (input === "G") {
        setScrollOffset(clampOffset(allLines.length));
        return;
      }
      if (key.pageUp) {
        setScrollOffset((o) => clampOffset(o - visibleHeight));
        return;
      }
      if (key.pageDown) {
        setScrollOffset((o) => clampOffset(o + visibleHeight));
        return;
      }
    },
    { isActive }
  );

  const visibleLines = allLines.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box flexDirection="column" height={contentHeight}>
      <Box paddingX={1} flexDirection="row">
        <Text color={colors.accent} bold>
          Timeline
        </Text>
        <Box flexGrow={1} />
        <Text color={colors.textDim}>
          {scrollOffset + 1}-{Math.min(scrollOffset + visibleHeight, allLines.length)}/
          {allLines.length}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleLines.map((line, i) => renderLine(line, scrollOffset + i))}
      </Box>
      <StatusBar hints="j/k:scroll  g/G:top/bottom  PgUp/PgDn:page  1:sessions  3:tools  4:overview  q:quit" />
    </Box>
  );
}

export const TimelineScreen = memo(TimelineScreenInner);

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

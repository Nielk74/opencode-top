import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { colors } from "./theme";
import { TabBar } from "./components/TabBar";
import { SessionsScreen } from "./screens/SessionsScreen";
import { ToolsScreen } from "./screens/ToolsScreen";
import { OverviewScreen } from "./screens/OverviewScreen";
import type { Workflow, Session, ScreenId } from "../core/types";
import { loadSessions, sessionExists } from "../data/sqlite";
import { groupSessionsToWorkflows } from "../core/agents";

interface AppProps {
  refreshInterval?: number;
}

function workflowsEqual(a: Workflow[], b: Workflow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
    if (a[i].mainSession.interactions.length !== b[i].mainSession.interactions.length) return false;
    if (a[i].subAgentSessions.length !== b[i].subAgentSessions.length) return false;
  }
  return true;
}

export function App({ refreshInterval = 2000 }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [terminalHeight, setTerminalHeight] = useState(stdout?.rows ?? 24);
  const [terminalWidth, setTerminalWidth] = useState(stdout?.columns ?? 80);

  // Enter alternate screen buffer on mount — prevents Ink's clearTerminal flash.
  // Ink triggers \x1b[2J\x1b[3J\x1b[H whenever outputHeight >= stdout.rows.
  // Alt screen (\x1b[?1049h) moves rendering to a separate buffer so the main
  // screen is never touched, eliminating the black flash entirely.
  useEffect(() => {
    stdout?.write("\x1b[?1049h"); // enter alt screen
    stdout?.write("\x1b[?25l");   // hide cursor
    return () => {
      stdout?.write("\x1b[?25h"); // restore cursor
      stdout?.write("\x1b[?1049l"); // leave alt screen
    };
  }, [stdout]);

  // Terminal resize handling
  useEffect(() => {
    const onResize = () => {
      if (stdout) {
        setTerminalHeight(stdout.rows ?? 24);
        setTerminalWidth(stdout.columns ?? 80);
      }
    };
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, [stdout]);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [screen, setScreen] = useState<ScreenId>("sessions");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const workflowsRef = useRef<Workflow[]>([]);
  const sessionsRef = useRef<Map<string, Session>>(new Map());
  const lastMessageTimeRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);
  const mountedRef = useRef(false);

  const loadData = useCallback(() => {
    if (!sessionExists()) {
      if (mountedRef.current) {
        setError("No OpenCode database found. Run OpenCode first.");
      }
      return;
    }

    try {
      const sinceTime = isFirstLoadRef.current ? undefined : lastMessageTimeRef.current;
      const { sessions: newSessions, maxMessageTime } = loadSessions(undefined, sinceTime);

      // On first load, populate the map; on incremental, merge updated sessions
      if (isFirstLoadRef.current) {
        sessionsRef.current = new Map(newSessions.map((s) => [s.id, s]));
        isFirstLoadRef.current = false;
      } else {
        if (newSessions.length === 0) {
          // No new data, skip re-grouping
          return;
        }
        for (const s of newSessions) {
          sessionsRef.current.set(s.id, s);
        }
      }

      lastMessageTimeRef.current = maxMessageTime;

      const allSessions = Array.from(sessionsRef.current.values());
      const grouped = groupSessionsToWorkflows(allSessions);

      if (!workflowsEqual(workflowsRef.current, grouped)) {
        workflowsRef.current = grouped;
        if (mountedRef.current) {
          setWorkflows(grouped);
          setLastRefresh(new Date());
        }
      }

      if (mountedRef.current) {
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    const interval = setInterval(loadData, refreshInterval);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadData, refreshInterval]);

  // Global: q quit, r refresh, 1-3 tabs
  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
      return;
    }
    if (input === "r") {
      loadData();
      return;
    }
    if (input === "1") { setScreen("sessions"); return; }
    if (input === "2") { setScreen("tools"); return; }
    if (input === "3") { setScreen("overview"); return; }
  });

  if (error) {
    return (
      <Box flexDirection="column" padding={2}>
        <Text color={colors.error} bold>Error</Text>
        <Text color={colors.text}>{error}</Text>
        <Box marginTop={1}>
          <Text color={colors.textDim}>Press q to quit</Text>
        </Box>
      </Box>
    );
  }

  // TabBar = 2 rows, leave 1 row spare to stay below Ink's clearTerminal threshold
  const contentHeight = terminalHeight - 3;

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight - 1}>
      <TabBar activeScreen={screen} lastRefresh={lastRefresh} />
      <Box width={terminalWidth} height={contentHeight}>
        {screen === "sessions" && (
          <SessionsScreen
            workflows={workflows}
            isActive={true}
            contentHeight={contentHeight}
            terminalWidth={terminalWidth}
          />
        )}
        {screen === "tools" && (
          <ToolsScreen
            workflows={workflows}
            isActive={true}
            contentHeight={contentHeight}
            terminalWidth={terminalWidth}
          />
        )}
        {screen === "overview" && (
          <OverviewScreen
            workflows={workflows}
            isActive={true}
            contentHeight={contentHeight}
            terminalWidth={terminalWidth}
          />
        )}
      </Box>
    </Box>
  );
}

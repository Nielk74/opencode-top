import React, { useState, useMemo, useCallback, memo } from "react";
import { Box, Text, useInput } from "ink";
import { colors } from "../theme";
import { StatusBar } from "../components/StatusBar";
import { AgentTree } from "../components/AgentTree";
import { DetailsPanel } from "../components/DetailsPanel";
import { MessagesPanel } from "../components/MessagesPanel";
import type { Workflow, AgentNode, FlatNode } from "../../core/types";

interface SessionsScreenProps {
  workflows: Workflow[];
  isActive: boolean;
  contentHeight: number;
  terminalWidth: number;
}

type RightMode = "stats" | "messages";

function flattenWorkflow(workflow: Workflow, workflowIndex: number): FlatNode[] {
  const nodes: FlatNode[] = [];
  function walk(node: AgentNode) {
    nodes.push({
      id: node.session.id,
      session: node.session,
      workflowIndex,
      depth: node.depth,
      hasChildren: node.children.length > 0,
      agentNode: node,
    });
    for (const child of node.children) walk(child);
  }
  walk(workflow.agentTree);
  return nodes;
}

function SessionsScreenInner({
  workflows,
  isActive,
  contentHeight,
  terminalWidth,
}: SessionsScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rightMode, setRightMode] = useState<RightMode>("stats");

  const flatNodes = useMemo(() => {
    return workflows.flatMap((w, i) => flattenWorkflow(w, i));
  }, [workflows]);

  const clampedIndex = Math.min(selectedIndex, Math.max(0, flatNodes.length - 1));
  const selectedNode = flatNodes[clampedIndex] ?? null;

  const selectedWorkflow = useMemo(() => {
    if (!selectedNode) return null;
    const w = workflows[selectedNode.workflowIndex];
    if (!w) return null;
    if (selectedNode.session.id !== w.mainSession.id) {
      return {
        id: selectedNode.session.id,
        mainSession: selectedNode.session,
        subAgentSessions: selectedNode.agentNode.children.map((c) => c.session),
        agentTree: selectedNode.agentNode,
      };
    }
    return w;
  }, [selectedNode, workflows]);

  const leftWidth = Math.floor(terminalWidth * 0.35);
  const rightWidth = terminalWidth - leftWidth - 2;

  const statusBarHeight = 1;
  const borderRows = 2;
  const innerHeight = contentHeight - statusBarHeight - borderRows;
  const panelHeight = contentHeight - statusBarHeight;
  const msgHeight = innerHeight - 1; // minus tab header row

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // SessionsScreen only handles: tab switch, tree nav (stats mode), session switch (messages mode)
  useInput(
    (input, key) => {
      if (key.tab) {
        setRightMode((m) => (m === "stats" ? "messages" : "stats"));
        return;
      }
      if (rightMode === "stats") {
        if (key.upArrow || input === "k") { handleSelect(Math.max(0, clampedIndex - 1)); return; }
        if (key.downArrow || input === "j") { handleSelect(Math.min(flatNodes.length - 1, clampedIndex + 1)); return; }
        if (input === "g") { handleSelect(0); return; }
        if (input === "G") { handleSelect(flatNodes.length - 1); return; }
      } else {
        // In messages mode, [ and ] switch session
        if (input === "[") { handleSelect(Math.max(0, clampedIndex - 1)); return; }
        if (input === "]") { handleSelect(Math.min(flatNodes.length - 1, clampedIndex + 1)); return; }
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column" width={terminalWidth} height={contentHeight}>
      <Box flexDirection="row" height={panelHeight}>
        {/* Left: agent/session tree */}
        <Box
          width={leftWidth}
          height={panelHeight}
          borderStyle="single"
          borderColor={colors.border}
          flexDirection="column"
        >
          <AgentTree
            workflows={workflows}
            selectedId={selectedNode?.id ?? null}
            flatNodes={flatNodes}
            onSelect={(id) => {
              const idx = flatNodes.findIndex((n) => n.id === id);
              if (idx >= 0) handleSelect(idx);
            }}
            maxHeight={innerHeight}
          />
        </Box>

        {/* Right: details or messages */}
        <Box
          width={rightWidth}
          height={panelHeight}
          borderStyle="single"
          borderColor={colors.border}
          flexDirection="column"
        >
          {/* Tab header: 1 row */}
          <Box paddingX={1} height={1} flexDirection="row">
            <Text color={rightMode === "stats" ? colors.accent : colors.textDim} bold={rightMode === "stats"}>
              [Stats]
            </Text>
            <Text color={colors.textDim}> </Text>
            <Text color={rightMode === "messages" ? colors.accent : colors.textDim} bold={rightMode === "messages"}>
              [Messages]
            </Text>
            <Box flexGrow={1} />
            <Text color={colors.textDim}>Tab:switch</Text>
          </Box>

          {rightMode === "stats" ? (
            <DetailsPanel workflow={selectedWorkflow} height={innerHeight - 1} />
          ) : (
            <MessagesPanel
              session={selectedNode?.session ?? null}
              maxHeight={msgHeight}
              isActive={isActive && rightMode === "messages"}
            />
          )}
        </Box>
      </Box>

      <StatusBar
        hints={
          rightMode === "messages"
            ? "j/k:scroll  d/u:½page  g/G:top/bot  Enter:expand  [:prev  ]:next  Tab:stats  q:quit"
            : "j/k:nav  g/G:top/bot  Tab:messages  2:tools  3:overview  r:refresh  q:quit"
        }
      />
    </Box>
  );
}

export const SessionsScreen = memo(SessionsScreenInner);

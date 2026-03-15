import React, { memo } from "react";
import { Box, Text } from "ink";
import { colors } from "../theme";
import type { AgentNode } from "../../core/types";
import { getSessionTokens, getSessionCostSingle } from "../../core/session";
import { getPricing } from "../../data/pricing";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface AgentNodeRowProps {
  node: AgentNode;
  isLast: boolean;
  prefix: string;
}

function AgentNodeRow({ node, isLast, prefix }: AgentNodeRowProps) {
  const { session } = node;
  const tokens = getSessionTokens(session);
  const pricing = getPricing(session.interactions[0]?.modelId ?? "");
  const cost = getSessionCostSingle(session, pricing);
  const agentName = session.interactions[0]?.agent ?? session.interactions[0]?.role ?? "main";

  const connector = isLast ? "└─ " : "├─ ";
  const childPrefix = prefix + (isLast ? "   " : "│  ");

  return (
    <>
      <Box flexDirection="row">
        <Text color={colors.textDim}>{prefix}{connector}</Text>
        <Text color={colors.cyan}>[{agentName}]</Text>
        <Text color={colors.text}> {truncate(session.title ?? session.id.slice(0, 8), 20)}</Text>
        <Box flexGrow={1} />
        <Text color={colors.textDim}>{formatTokens(tokens.total)}</Text>
        <Text color={colors.textDim}> </Text>
        <Text color={colors.success}>${cost.toFixed(3)}</Text>
      </Box>
      {node.children.map((child, i) => (
        <AgentNodeRow
          key={child.session.id}
          node={child}
          isLast={i === node.children.length - 1}
          prefix={childPrefix}
        />
      ))}
    </>
  );
}

interface AgentChainGraphProps {
  agentTree: AgentNode;
}

function AgentChainGraphInner({ agentTree }: AgentChainGraphProps) {
  const { session } = agentTree;
  const tokens = getSessionTokens(session);
  const pricing = getPricing(session.interactions[0]?.modelId ?? "");
  const cost = getSessionCostSingle(session, pricing);
  const agentName = session.interactions[0]?.agent ?? "main";

  if (agentTree.children.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color={colors.cyan} bold>[{agentName}]</Text>
        <Text color={colors.text}> {truncate(session.title ?? "root", 20)}</Text>
        <Box flexGrow={1} />
        <Text color={colors.textDim}>{formatTokens(tokens.total)}</Text>
        <Text color={colors.textDim}> </Text>
        <Text color={colors.success}>${cost.toFixed(3)}</Text>
      </Box>
      {agentTree.children.map((child, i) => (
        <AgentNodeRow
          key={child.session.id}
          node={child}
          isLast={i === agentTree.children.length - 1}
          prefix=""
        />
      ))}
    </Box>
  );
}

export const AgentChainGraph = memo(AgentChainGraphInner);

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

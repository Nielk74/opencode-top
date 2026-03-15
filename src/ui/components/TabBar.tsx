import React, { memo } from "react";
import { Box, Text } from "ink";
import { colors } from "../theme";
import type { ScreenId } from "../../core/types";

interface TabBarProps {
  activeScreen: ScreenId;
  lastRefresh: Date;
}

const TABS: { id: ScreenId; label: string; key: string }[] = [
  { id: "sessions", label: "Sessions", key: "1" },
  { id: "tools", label: "Tools", key: "2" },
  { id: "overview", label: "Overview", key: "3" },
];

function TabBarInner({ activeScreen, lastRefresh }: TabBarProps) {
  return (
    <Box flexDirection="column" height={2}>
      <Box paddingX={1} height={1} flexDirection="row" alignItems="center">
        <Text color={colors.accent} bold>◆ oc-top</Text>
        <Text color={colors.textMuted}> │ </Text>
        {TABS.map((tab, i) => {
          const isActive = tab.id === activeScreen;
          return (
            <Box key={tab.id} marginRight={1}>
              {isActive ? (
                <Text backgroundColor={colors.bgHighlight} color={colors.accent} bold>
                  {` ${tab.key}:${tab.label} `}
                </Text>
              ) : (
                <Text color={colors.textDim}>
                  {` ${tab.key}:${tab.label} `}
                </Text>
              )}
            </Box>
          );
        })}
        <Box flexGrow={1} />
        <Text color={colors.textMuted}>↻ </Text>
        <Text color={colors.textDim}>{lastRefresh.toLocaleTimeString()}</Text>
      </Box>
      <Box paddingX={0} height={1}>
        <Text color={colors.border}>{"─".repeat(200)}</Text>
      </Box>
    </Box>
  );
}

export const TabBar = memo(TabBarInner);

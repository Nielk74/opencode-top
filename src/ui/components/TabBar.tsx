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
    <Box paddingX={1} height={1} flexDirection="row">
      <Text color={colors.accent} bold>oc-top </Text>
      {TABS.map((tab) => {
        const isActive = tab.id === activeScreen;
        return (
          <Box key={tab.id} marginRight={1}>
            <Text color={isActive ? colors.accent : colors.textDim} bold={isActive}>
              [{tab.key}]{isActive ? <Text color={colors.text}> {tab.label}</Text> : ` ${tab.label}`}
            </Text>
          </Box>
        );
      })}
      <Box flexGrow={1} />
      <Text color={colors.textDim}>{lastRefresh.toLocaleTimeString()}</Text>
    </Box>
  );
}

export const TabBar = memo(TabBarInner);

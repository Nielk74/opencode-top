import React, { memo } from "react";
import { Box, Text } from "ink";
import { colors } from "../theme";

interface StatusBarProps {
  hints: string;
  info?: string;
}

function StatusBarInner({ hints, info }: StatusBarProps) {
  return (
    <Box flexDirection="column" height={2}>
      <Box paddingX={0} height={1}>
        <Text color={colors.border}>{"─".repeat(200)}</Text>
      </Box>
      <Box paddingX={1} height={1} flexDirection="row">
        <Text color={colors.textMuted}>{hints}</Text>
        {info && (
          <>
            <Box flexGrow={1} />
            <Text color={colors.info}>{info}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}

export const StatusBar = memo(StatusBarInner);

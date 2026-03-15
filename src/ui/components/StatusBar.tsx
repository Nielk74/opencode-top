import React, { memo } from "react";
import { Box, Text } from "ink";
import { colors } from "../theme";

interface StatusBarProps {
  hints: string;
  info?: string;
}

function StatusBarInner({ hints, info }: StatusBarProps) {
  return (
    <Box paddingX={1} height={1} flexDirection="row">
      <Text color={colors.textDim}>{hints}</Text>
      {info && (
        <>
          <Box flexGrow={1} />
          <Text color={colors.info}>{info}</Text>
        </>
      )}
    </Box>
  );
}

export const StatusBar = memo(StatusBarInner);

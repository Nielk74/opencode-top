import React, { memo } from "react";
import { Text } from "ink";
import { colors } from "../theme";
import { buildSparkSeries } from "../../core/session";

interface SparkLineProps {
  values: number[];
  color?: string;
  width?: number;
}

function SparkLineInner({ values, color = colors.info, width }: SparkLineProps) {
  const data = width && values.length > width ? values.slice(-width) : values;
  const spark = buildSparkSeries(data);
  return <Text color={color}>{spark}</Text>;
}

export const SparkLine = memo(SparkLineInner);

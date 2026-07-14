import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing } from "@/theme";

interface CardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Shadow depth preset. Defaults to "sm". */
  elevation?: "sm" | "md" | "lg";
  /** Internal padding. Defaults to `spacing.lg`. Pass 0 to opt out. */
  padding?: number;
}

/** White rounded surface with a shadow preset — the base for most list rows / panels. */
export function Card({ children, style, elevation = "sm", padding = spacing.lg }: CardProps) {
  return <View style={[styles.card, shadow[elevation], { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
  },
});

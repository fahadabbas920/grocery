import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { colors, fontSize, spacing } from "@/theme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Optional action, e.g. a retry button for error states. */
  actionLabel?: string;
  onAction?: () => void;
  /** Icon tint. Defaults to the pale brand green. */
  iconColor?: string;
}

/** Centered icon + title + subtitle, used for empty lists and error states. */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  iconColor = colors.brandPale,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={64} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="outline" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: 80,
  },
  title: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  action: { marginTop: spacing.md, paddingHorizontal: spacing.xxl },
});

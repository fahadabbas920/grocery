import { StyleSheet, Text, View } from "react-native";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { fontSize, radius, spacing, statusColors } from "@/theme";

interface StatusBadgeProps {
  status: OrderStatus;
  /** Show a leading colored dot (used on the order detail pill). */
  dot?: boolean;
  size?: "sm" | "md";
}

/** Pill showing the human status label, tinted by the status color. */
export function StatusBadge({ status, dot = false, size = "sm" }: StatusBadgeProps) {
  const color = statusColors[status];
  return (
    <View
      style={[styles.badge, size === "md" && styles.badgeMd, { backgroundColor: color + "20" }]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.text, size === "md" && styles.textMd, { color }]}>
        {ORDER_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeMd: { paddingHorizontal: spacing.md, paddingVertical: 5, gap: spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: fontSize.xs, fontWeight: "700" },
  textMd: { fontSize: fontSize.md },
});

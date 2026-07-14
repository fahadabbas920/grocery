import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { colors, fontSize, spacing } from "@/theme";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

/** Compact metric tile: icon over a value and a label. */
export function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card style={styles.card} padding={spacing.lg}>
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, alignItems: "center", gap: spacing.xs },
  value: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  label: { fontSize: fontSize.xs, color: colors.textMuted },
});

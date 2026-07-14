import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { StatusBadge } from "./StatusBadge";
import { colors, fontSize, radius, shadow, spacing, statusColors } from "@/theme";
import { formatDate, formatTime } from "@/lib/date";
import { formatMoney, formatOrderRef } from "@/lib/format";

interface OrderCardData {
  id: string;
  status: OrderStatus;
  total: number;
  address: string;
  itemCount: number;
  createdAt?: string;
}

interface OrderCardProps {
  order: OrderCardData;
  /** "active" = tappable list row; "history" = static completed-order row. */
  variant: "active" | "history";
  onPress?: () => void;
}

function itemLabel(n: number) {
  return `${n} item${n !== 1 ? "s" : ""}`;
}

export function OrderCard({ order, variant, onPress }: OrderCardProps) {
  const accent = statusColors[order.status];

  if (variant === "history") {
    return (
      <View style={[styles.card, styles.cardHistory]}>
        <View style={[styles.stripe, { backgroundColor: accent }]} />
        <View style={styles.contentSm}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderId}>{formatOrderRef(order.id)}</Text>
            {order.createdAt ? (
              <Text style={styles.faint}>{formatTime(order.createdAt)}</Text>
            ) : null}
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.addressSm} numberOfLines={1}>
              {order.address}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.faint}>
              {order.createdAt ? `${formatDate(order.createdAt)} · ` : ""}
              {itemLabel(order.itemCount)}
            </Text>
            <View style={styles.rightGroup}>
              <Text style={[styles.statusLabel, { color: accent }]}>
                {ORDER_STATUS_LABELS[order.status]}
              </Text>
              <Text style={styles.totalSm}>{formatMoney(order.total)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, styles.cardActive, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.stripe, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.rowBetween}>
          <Text style={styles.orderId}>{formatOrderRef(order.id)}</Text>
          <StatusBadge status={order.status} />
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.address} numberOfLines={1}>
            {order.address}
          </Text>
        </View>
        <View style={[styles.rowBetween, styles.bottom]}>
          <View style={styles.metaItem}>
            <Ionicons name="basket-outline" size={14} color={colors.textMuted} />
            <Text style={styles.meta}>{itemLabel(order.itemCount)}</Text>
          </View>
          <Text style={styles.total}>{formatMoney(order.total)}</Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textDisabled}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardActive: { borderRadius: radius.lg, ...shadow.md },
  cardHistory: { borderRadius: radius.md, ...shadow.sm },
  pressed: { opacity: 0.85 },
  stripe: { width: 4 },
  content: { flex: 1, padding: 14, gap: spacing.xs + 2 },
  contentSm: { flex: 1, padding: spacing.md, gap: 5 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bottom: { marginTop: 2 },
  orderId: {
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    color: colors.textFaint,
    fontWeight: "600",
  },
  faint: { fontSize: fontSize.xs, color: colors.textFaint },
  addressRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  address: { flex: 1, fontSize: fontSize.base, color: colors.textSecondary },
  addressSm: { flex: 1, fontSize: fontSize.md, color: colors.textSecondary },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  total: { fontSize: fontSize.base, fontWeight: "700", color: colors.text },
  totalSm: { fontSize: fontSize.md, fontWeight: "700", color: colors.text },
  rightGroup: { alignItems: "flex-end", gap: 1 },
  statusLabel: { fontSize: fontSize.xs, fontWeight: "600" },
  chevron: { alignSelf: "center", marginRight: spacing.md },
});

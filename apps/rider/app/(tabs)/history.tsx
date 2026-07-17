import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { getRiderOrderHistory } from "@grocery/db/queries";
import type { OrderStatus } from "@grocery/shared";
import { supabase } from "@/lib/supabase";
import { EmptyState, OrderCard, StatCard } from "@/components";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFocusRefetch } from "@/hooks/useFocusRefetch";
import { formatMoney } from "@/lib/format";
import { colors, spacing } from "@/theme";

interface HistoryRow {
  id: string;
  status: OrderStatus;
  total: number;
  address: string;
  itemCount: number;
  createdAt: string;
}

export default function OrderHistoryScreen() {
  const { user } = useCurrentUser();
  const [orders, setOrders] = useState<HistoryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await getRiderOrderHistory(supabase, user.id);
      const mapped = rows.map((o) => ({
        id: o.id,
        status: o.status,
        total: Number(o.subtotal),
        address: o.order?.address ?? "",
        itemCount: o.items?.length ?? 0,
        createdAt: o.created_at,
      }));
      setOrders(mapped);
      setTotalEarnings(
        mapped.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.total, 0),
      );
      setError(false);
    } catch {
      setError(true);
    }
  }, [user]);

  useFocusRefetch(load);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, orders.length === 0 && styles.listEmpty]}
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }
      ListHeaderComponent={
        orders.length > 0 ? (
          <View style={styles.summaryRow}>
            <StatCard
              icon="checkmark-circle-outline"
              value={String(deliveredCount)}
              label="Delivered"
            />
            <StatCard
              icon="cash-outline"
              value={formatMoney(totalEarnings)}
              label="Total collected"
            />
          </View>
        ) : null
      }
      ListEmptyComponent={
        error ? (
          <EmptyState
            icon="cloud-offline-outline"
            iconColor={colors.textDisabled}
            title="Couldn't load history"
            subtitle="Check your connection and try again."
            actionLabel="Retry"
            onAction={onRefresh}
          />
        ) : (
          <EmptyState
            icon="time-outline"
            title="No history yet"
            subtitle="Completed deliveries will appear here."
          />
        )
      }
      renderItem={({ item }) => <OrderCard order={item} variant="history" />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  list: { padding: 16, gap: 10 },
  listEmpty: { flex: 1 },
  summaryRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xs },
});

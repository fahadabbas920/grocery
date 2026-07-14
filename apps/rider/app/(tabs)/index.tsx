import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getRiderActiveOrders } from "@grocery/db/queries";
import type { OrderStatus } from "@grocery/shared";
import { supabase } from "@/lib/supabase";
import { EmptyState, OrderCard } from "@/components";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFocusRefetch } from "@/hooks/useFocusRefetch";
import { colors } from "@/theme";

interface OrderRow {
  id: string;
  status: OrderStatus;
  total: number;
  address: string;
  itemCount: number;
}

export default function ActiveOrdersScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await getRiderActiveOrders(supabase, user.id);
      setOrders(
        rows.map((o) => ({
          id: o.id,
          status: o.status,
          total: Number(o.total),
          address: o.address,
          itemCount: o.items?.length ?? 0,
        })),
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

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, orders.length === 0 && styles.listEmpty]}
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }
      ListEmptyComponent={
        error ? (
          <EmptyState
            icon="cloud-offline-outline"
            iconColor={colors.textDisabled}
            title="Couldn't load orders"
            subtitle="Check your connection and try again."
            actionLabel="Retry"
            onAction={onRefresh}
          />
        ) : (
          <EmptyState
            icon="bicycle-outline"
            title="All clear!"
            subtitle={"No orders assigned to you right now.\nPull down to refresh."}
          />
        )
      }
      renderItem={({ item }) => (
        <OrderCard order={item} variant="active" onPress={() => router.push(`/order/${item.id}`)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  list: { padding: 16, gap: 12 },
  listEmpty: { flex: 1 },
});

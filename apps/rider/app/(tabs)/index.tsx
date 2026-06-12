import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getRiderActiveOrders } from "@grocery/db/queries";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { supabase } from "@/lib/supabase";

interface OrderRow {
  id: string;
  status: OrderStatus;
  total: number;
  address: string;
  itemCount: number;
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  placed: "#f59e0b",
  preparing: "#3b82f6",
  on_the_way: "#8b5cf6",
  delivered: "#16a34a",
  cancelled: "#ef4444",
};

export default function ActiveOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, orders.length === 0 && styles.listEmpty]}
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="bicycle-outline" size={64} color="#d1fae5" />
          <Text style={styles.emptyTitle}>All clear!</Text>
          <Text style={styles.emptySubtitle}>No orders assigned to you right now.{"\n"}Pull down to refresh.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const statusColor = STATUS_COLOR[item.status];
        return (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/order/${item.id}`)}
          >
            <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {ORDER_STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.metaItem}>
                  <Ionicons name="basket-outline" size={14} color="#6b7280" />
                  <Text style={styles.meta}>{item.itemCount} item{item.itemCount !== 1 ? "s" : ""}</Text>
                </View>
                <Text style={styles.total}>PKR {item.total.toLocaleString()}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" style={styles.chevron} />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#f8fafc" },
  list: { padding: 16, gap: 12 },
  listEmpty: { flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  emptySubtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: { opacity: 0.85 },
  statusBar: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 12, fontFamily: "monospace", color: "#9ca3af", fontWeight: "600" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 14, color: "#374151", flex: 1 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 12, color: "#6b7280" },
  total: { fontSize: 14, fontWeight: "700", color: "#111827" },
  chevron: { alignSelf: "center", marginRight: 12 },
});

import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getRiderOrderHistory } from "@grocery/db/queries";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { supabase } from "@/lib/supabase";

interface HistoryRow {
  id: string;
  status: OrderStatus;
  total: number;
  address: string;
  itemCount: number;
  createdAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<HistoryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = await getRiderOrderHistory(supabase, user.id);
    const mapped = rows.map((o) => ({
      id: o.id,
      status: o.status,
      total: Number(o.total),
      address: o.address,
      itemCount: o.items?.length ?? 0,
      createdAt: o.created_at,
    }));
    setOrders(mapped);
    setTotalEarnings(
      mapped.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.total, 0),
    );
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, orders.length === 0 && styles.listEmpty]}
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
      ListHeaderComponent={
        orders.length > 0 ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
              <Text style={styles.summaryValue}>{deliveredCount}</Text>
              <Text style={styles.summaryLabel}>Delivered</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="cash-outline" size={20} color="#16a34a" />
              <Text style={styles.summaryValue}>PKR {totalEarnings.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total collected</Text>
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color="#d1fae5" />
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySubtitle}>Completed deliveries will appear here.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const isDelivered = item.status === "delivered";
        return (
          <View style={styles.card}>
            <View style={[styles.statusDot, { backgroundColor: isDelivered ? "#16a34a" : "#ef4444" }]} />
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
              </View>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={13} color="#6b7280" />
                <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.date}>{formatDate(item.createdAt)} · {item.itemCount} item{item.itemCount !== 1 ? "s" : ""}</Text>
                <View style={styles.rightGroup}>
                  <Text style={[styles.statusLabel, { color: isDelivered ? "#16a34a" : "#ef4444" }]}>
                    {ORDER_STATUS_LABELS[item.status]}
                  </Text>
                  <Text style={styles.total}>PKR {item.total.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#f8fafc" },
  list: { padding: 16, gap: 10 },
  listEmpty: { flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  emptySubtitle: { fontSize: 14, color: "#6b7280" },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
  summaryLabel: { fontSize: 11, color: "#6b7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statusDot: { width: 4 },
  cardContent: { flex: 1, padding: 12, gap: 5 },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  orderId: { fontSize: 11, fontFamily: "monospace", color: "#9ca3af", fontWeight: "600" },
  time: { fontSize: 11, color: "#9ca3af" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 13, color: "#374151", flex: 1 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 11, color: "#9ca3af" },
  rightGroup: { alignItems: "flex-end", gap: 1 },
  statusLabel: { fontSize: 11, fontWeight: "600" },
  total: { fontSize: 13, fontWeight: "700", color: "#111827" },
});

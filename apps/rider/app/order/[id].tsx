import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getOrderWithItems } from "@grocery/db/queries";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { supabase } from "@/lib/supabase";
import { startLocationSharing, stopLocationSharing } from "@/lib/location-task";

interface OrderDetail {
  id: string;
  status: OrderStatus;
  total: number;
  address: string;
  lat: number;
  lng: number;
  items: { name: string; qty: number; unitPrice: number }[];
  createdAt: string;
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  placed: "#f59e0b",
  preparing: "#3b82f6",
  on_the_way: "#8b5cf6",
  delivered: "#16a34a",
  cancelled: "#ef4444",
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrderWithItems(supabase, id).then((o) =>
      setOrder({
        id: o.id,
        status: o.status,
        total: Number(o.total),
        address: o.address,
        lat: o.delivery_lat,
        lng: o.delivery_lng,
        items: (o.items ?? []).map((i) => ({
          name: i.product?.name ?? "Product",
          qty: i.quantity,
          unitPrice: Number(i.unit_price),
        })),
        createdAt: o.created_at,
      }),
    );
  }, [id]);

  if (!order) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const statusColor = STATUS_COLOR[order.status];
  const canStart = order.status === "preparing";
  const canDeliver = order.status === "on_the_way";

  function openMaps() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${order!.lat},${order!.lng}`;
    Linking.openURL(url);
  }

  async function updateStatus(next: OrderStatus) {
    if (!order) return;
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", order.id);
    setBusy(false);
    if (error) {
      Alert.alert("Update failed", error.message);
      return;
    }
    if (next === "on_the_way") await startLocationSharing();
    if (next === "delivered") {
      await stopLocationSharing();
      router.replace("/");
      return;
    }
    setOrder({ ...order, status: next });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.statusCard}>
        <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
        <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Delivery address</Text>
        <View style={styles.addressCard}>
          <Ionicons name="location" size={18} color="#16a34a" />
          <Text style={styles.addressText}>{order.address}</Text>
        </View>
        <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
          <Ionicons name="navigate-outline" size={16} color="#fff" />
          <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Items</Text>
        <View style={styles.itemsCard}>
          {order.items.map((item, i) => (
            <View key={i} style={[styles.itemRow, i < order.items.length - 1 && styles.itemBorder]}>
              <Text style={styles.itemQty}>{item.qty}×</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>PKR {(item.qty * item.unitPrice).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Cash to collect</Text>
            <Text style={styles.totalValue}>PKR {order.total.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {(canStart || canDeliver) && (
        <View style={styles.actions}>
          {canStart && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => updateStatus("on_the_way")}
              disabled={busy}
            >
              <Ionicons name="bicycle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Start delivery</Text>
            </TouchableOpacity>
          )}
          {canDeliver && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGreen]}
              onPress={() => updateStatus("delivered")}
              disabled={busy}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Mark as delivered</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  screen: { backgroundColor: "#f8fafc" },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontWeight: "700", fontSize: 13 },
  orderId: { fontSize: 12, fontFamily: "monospace", color: "#9ca3af", fontWeight: "600" },
  section: { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  addressCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  addressText: { flex: 1, fontSize: 15, color: "#111827", lineHeight: 22 },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1d4ed8",
    borderRadius: 10,
    padding: 12,
  },
  mapsBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  itemsCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  itemQty: { fontSize: 13, color: "#6b7280", width: 28 },
  itemName: { flex: 1, fontSize: 14, color: "#111827" },
  itemPrice: { fontSize: 13, fontWeight: "600", color: "#374151" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f0fdf4",
    borderTopWidth: 1,
    borderTopColor: "#dcfce7",
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#166534" },
  totalValue: { fontSize: 16, fontWeight: "700", color: "#16a34a" },
  actions: { gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    padding: 16,
  },
  actionBtnPrimary: { backgroundColor: "#8b5cf6" },
  actionBtnGreen: { backgroundColor: "#16a34a" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

import { useCallback, useEffect, useState } from "react";
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
import { getStoreOrder, updateOrderStatus } from "@grocery/db/queries";
import type { OrderStatus } from "@grocery/shared";
import { supabase } from "@/lib/supabase";
import { startLocationSharing, stopLocationSharing } from "@/lib/location-task";
import { Button, Card, EmptyState, StatusBadge } from "@/components";
import { formatMoney, formatOrderRef } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/theme";

interface OrderDetail {
  id: string;
  status: OrderStatus;
  total: number;
  address: string | null;
  lat: number | null;
  lng: number | null;
  items: { name: string; qty: number; unitPrice: number }[];
  createdAt: string;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const o = await getStoreOrder(supabase, id);
      setOrder({
        id: o.id,
        status: o.status,
        total: Number(o.subtotal),
        address: o.order?.address ?? null,
        lat: o.order?.delivery_lat ?? null,
        lng: o.order?.delivery_lng ?? null,
        items: (o.items ?? []).map((i) => ({
          name: i.product?.name ?? "Product",
          qty: i.quantity,
          unitPrice: Number(i.unit_price),
        })),
        createdAt: o.created_at,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Watch for external status changes (e.g. ops cancels the order). If the order
  // leaves `on_the_way`, stop any background GPS sharing so it doesn't leak.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "store_orders", filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as { status: OrderStatus };
          setOrder((prev) => (prev ? { ...prev, status: next.status } : prev));
          if (next.status !== "on_the_way") void stopLocationSharing();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.loading}>
        <EmptyState
          icon="cloud-offline-outline"
          iconColor={colors.textDisabled}
          title="Couldn't load order"
          subtitle="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void load()}
        />
      </View>
    );
  }

  const canStart = order.status === "preparing";
  const canDeliver = order.status === "on_the_way";

  async function openMaps() {
    if (!order || order.lat == null || order.lng == null) {
      Alert.alert("No location", "This order doesn't have delivery coordinates yet.");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Can't open maps", "No app is available to open the map link.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Can't open maps", "Something went wrong opening the map link.");
    }
  }

  async function updateStatus(next: OrderStatus) {
    if (!order) return;
    setBusy(true);
    try {
      await updateOrderStatus(supabase, order.id, next);

      if (next === "on_the_way") {
        const started = await startLocationSharing();
        if (!started) {
          Alert.alert(
            "Live tracking unavailable",
            "The delivery was started, but location sharing couldn't begin (permission denied, or you're running Expo Go). The customer won't see live tracking.",
          );
        }
      }

      if (next === "delivered") {
        await stopLocationSharing();
        router.replace("/");
        return;
      }

      setOrder({ ...order, status: next });
    } catch (e) {
      Alert.alert("Update failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Card style={styles.statusCard}>
        <StatusBadge status={order.status} dot size="md" />
        <Text style={styles.orderId}>{formatOrderRef(order.id)}</Text>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Delivery address</Text>
        <Card style={styles.addressCard} padding={14}>
          <Ionicons name="location" size={18} color={colors.brand} />
          <Text style={styles.addressText}>{order.address ?? "Address unavailable"}</Text>
        </Card>
        <TouchableOpacity
          style={[
            styles.mapsBtn,
            (order.lat == null || order.lng == null) && styles.mapsBtnDisabled,
          ]}
          onPress={openMaps}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate-outline" size={16} color={colors.white} />
          <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Items</Text>
        <Card style={styles.itemsCard} padding={0}>
          {order.items.map((item, i) => (
            <View key={i} style={[styles.itemRow, i < order.items.length - 1 && styles.itemBorder]}>
              <Text style={styles.itemQty}>{item.qty}×</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{formatMoney(item.qty * item.unitPrice)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Cash to collect</Text>
            <Text style={styles.totalValue}>{formatMoney(order.total)}</Text>
          </View>
        </Card>
      </View>

      {(canStart || canDeliver) && (
        <View style={styles.actions}>
          {canStart && (
            <Button
              label="Start delivery"
              icon="bicycle-outline"
              variant="purple"
              loading={busy}
              disabled={busy}
              onPress={() => updateStatus("on_the_way")}
            />
          )}
          {canDeliver && (
            <Button
              label="Mark as delivered"
              icon="checkmark-circle-outline"
              variant="green"
              loading={busy}
              disabled={busy}
              onPress={() => updateStatus("delivered")}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  screen: { backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 40 },
  statusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    color: colors.textFaint,
    fontWeight: "600",
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addressCard: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm + 2 },
  addressText: { flex: 1, fontSize: fontSize.lg, color: colors.text, lineHeight: 22 },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  mapsBtnText: { color: colors.white, fontWeight: "600", fontSize: fontSize.base },
  mapsBtnDisabled: { opacity: 0.5 },
  itemsCard: { overflow: "hidden" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    gap: spacing.sm + 2,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemQty: { fontSize: fontSize.md, color: colors.textMuted, width: 28 },
  itemName: { flex: 1, fontSize: fontSize.base, color: colors.text },
  itemPrice: { fontSize: fontSize.md, fontWeight: "600", color: colors.textSecondary },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    backgroundColor: colors.brandBg,
    borderTopWidth: 1,
    borderTopColor: colors.brandBgDeep,
  },
  totalLabel: { fontSize: fontSize.base, fontWeight: "700", color: colors.brandText },
  totalValue: { fontSize: fontSize.xl, fontWeight: "700", color: colors.brand },
  actions: { gap: spacing.sm + 2, marginTop: spacing.xs },
});

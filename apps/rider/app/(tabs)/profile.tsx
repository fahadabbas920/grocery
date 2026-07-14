import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getRiderOrderHistory } from "@grocery/db/queries";
import { supabase } from "@/lib/supabase";
import { Button, Card, EmptyState, StatCard } from "@/components";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isToday, isWithinLast7Days } from "@/lib/date";
import { formatMoney } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/theme";

interface Stats {
  todayDeliveries: number;
  todayEarnings: number;
  weekDeliveries: number;
  weekEarnings: number;
  allTimeDeliveries: number;
}

export default function ProfileScreen() {
  const { user, loading: userLoading } = useCurrentUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      setEmail(user.email ?? "");
      setName((user.user_metadata?.full_name as string) ?? "");

      const profile = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();
      if (profile.data) {
        setName(profile.data.full_name ?? "");
        setPhone(profile.data.phone ?? "");
      }

      const history = await getRiderOrderHistory(supabase, user.id);
      const delivered = history.filter((o) => o.status === "delivered");
      const todayDelivered = delivered.filter((o) => isToday(o.created_at));
      const weekDelivered = delivered.filter((o) => isWithinLast7Days(o.created_at));
      setStats({
        todayDeliveries: todayDelivered.length,
        todayEarnings: todayDelivered.reduce((s, o) => s + Number(o.total), 0),
        weekDeliveries: weekDelivered.length,
        weekEarnings: weekDelivered.reduce((s, o) => s + Number(o.total), 0),
        allTimeDeliveries: delivered.length,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!userLoading) void load();
  }, [userLoading, load]);

  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Card style={styles.headerCard} elevation="md" padding={spacing.xl}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name || "Rider"}</Text>
        {phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={14} color={colors.textMuted} />
            <Text style={styles.infoText}>{phone}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>{email}</Text>
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={styles.spinner} />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          iconColor={colors.textDisabled}
          title="Couldn't load stats"
          subtitle="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => void load()}
        />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.statsRow}>
            <StatCard
              icon="bicycle"
              label="Deliveries"
              value={String(stats?.todayDeliveries ?? 0)}
            />
            <StatCard
              icon="cash"
              label="Collected"
              value={formatMoney(stats?.todayEarnings ?? 0)}
            />
          </View>

          <Text style={styles.sectionTitle}>This week</Text>
          <View style={styles.statsRow}>
            <StatCard
              icon="bicycle"
              label="Deliveries"
              value={String(stats?.weekDeliveries ?? 0)}
            />
            <StatCard icon="cash" label="Collected" value={formatMoney(stats?.weekEarnings ?? 0)} />
          </View>

          <Text style={styles.sectionTitle}>All time</Text>
          <View style={styles.statsRow}>
            <StatCard
              icon="checkmark-circle"
              label="Total deliveries"
              value={String(stats?.allTimeDeliveries ?? 0)}
            />
          </View>
        </>
      )}

      <Button
        label="Sign out"
        icon="log-out-outline"
        variant="danger"
        onPress={() => supabase.auth.signOut()}
        style={styles.signOutBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  headerCard: { alignItems: "center", gap: spacing.xs + 2 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  avatarText: { color: colors.white, fontSize: 28, fontWeight: "700" },
  name: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  infoText: { fontSize: fontSize.md, color: colors.textMuted },
  spinner: { marginTop: 32 },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  statsRow: { flexDirection: "row", gap: spacing.md },
  signOutBtn: { marginTop: spacing.sm },
});

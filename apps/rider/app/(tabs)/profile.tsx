import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getRiderOrderHistory } from "@grocery/db/queries";
import { supabase } from "@/lib/supabase";

interface Stats {
  todayDeliveries: number;
  todayEarnings: number;
  weekDeliveries: number;
  weekEarnings: number;
  allTimeDeliveries: number;
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

export default function ProfileScreen() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      const weekDelivered = delivered.filter((o) => isThisWeek(o.created_at));
      setStats({
        todayDeliveries: todayDelivered.length,
        todayEarnings: todayDelivered.reduce((s, o) => s + Number(o.total), 0),
        weekDeliveries: weekDelivered.length,
        weekEarnings: weekDelivered.reduce((s, o) => s + Number(o.total), 0),
        allTimeDeliveries: delivered.length,
      });
      setLoading(false);
    }
    void load();
  }, []);

  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name || "Rider"}</Text>
        {phone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={14} color="#6b7280" />
            <Text style={styles.infoText}>{phone}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={14} color="#6b7280" />
          <Text style={styles.infoText}>{email}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 32 }} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.statsRow}>
            <StatCard icon="bicycle" label="Deliveries" value={String(stats?.todayDeliveries ?? 0)} />
            <StatCard icon="cash" label="Collected" value={`PKR ${(stats?.todayEarnings ?? 0).toLocaleString()}`} />
          </View>

          <Text style={styles.sectionTitle}>This week</Text>
          <View style={styles.statsRow}>
            <StatCard icon="bicycle" label="Deliveries" value={String(stats?.weekDeliveries ?? 0)} />
            <StatCard icon="cash" label="Collected" value={`PKR ${(stats?.weekEarnings ?? 0).toLocaleString()}`} />
          </View>

          <Text style={styles.sectionTitle}>All time</Text>
          <View style={styles.statsRow}>
            <StatCard icon="checkmark-circle" label="Total deliveries" value={String(stats?.allTimeDeliveries ?? 0)} />
          </View>
        </>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as "bicycle"} size={22} color="#16a34a" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#f8fafc" },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, color: "#6b7280" },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  statLabel: { fontSize: 11, color: "#6b7280" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  signOutText: { color: "#ef4444", fontWeight: "600", fontSize: 15 },
});

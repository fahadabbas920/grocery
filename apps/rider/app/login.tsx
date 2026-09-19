import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { resolveAuthIdentifier } from "@grocery/shared";
import { supabase } from "@/lib/supabase";
import { Button, TextField } from "@/components";
import { colors, fontSize, radius, shadow, spacing } from "@/theme";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!identifier.trim() || !password) {
      Alert.alert("Required", "Please enter your email/phone and password.");
      return;
    }
    setLoading(true);
    try {
      const { authEmail } = resolveAuthIdentifier(identifier.trim());
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });
      if (error) Alert.alert("Sign in failed", error.message);
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="bicycle" size={40} color={colors.white} />
            </View>
            <Text style={styles.appName}>BasketBee Rider</Text>
            <Text style={styles.tagline}>Deliver with confidence</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>

            <TextField
              label="Email or phone"
              icon="mail-outline"
              placeholder="rider@example.com or 03xx-xxxxxxx"
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
            />

            <TextField
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secure
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={signIn}
            />

            <Button
              label={loading ? "Signing in…" : "Sign in"}
              onPress={signIn}
              loading={loading}
              style={styles.signInBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandBg },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: spacing.xxl, gap: spacing.xxl },
  logoWrap: { alignItems: "center", gap: spacing.sm },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.brand,
  },
  appName: { fontSize: fontSize.hero, fontWeight: "800", color: colors.brandTextDeep },
  tagline: { fontSize: fontSize.base, color: colors.brandLight },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    gap: spacing.lg,
    ...shadow.lg,
  },
  cardTitle: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  signInBtn: { marginTop: spacing.xs },
});

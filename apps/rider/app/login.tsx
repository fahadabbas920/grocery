import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!email.trim() || !password) {
      Alert.alert("Required", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert("Sign in failed", error.message);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="bicycle" size={40} color="#fff" />
          </View>
          <Text style={styles.appName}>Grocery Rider</Text>
          <Text style={styles.tagline}>Deliver with confidence</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="rider@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputPassword]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={signIn}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
            onPress={signIn}
            disabled={loading}
          >
            <Text style={styles.signInBtnText}>{loading ? "Signing in…" : "Sign in"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0fdf4" },
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 24 },
  logoWrap: { alignItems: "center", gap: 8 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: { fontSize: 26, fontWeight: "800", color: "#14532d" },
  tagline: { fontSize: 14, color: "#4ade80" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
  },
  inputIcon: { paddingLeft: 12 },
  input: { flex: 1, padding: 12, fontSize: 15, color: "#111827" },
  inputPassword: { paddingRight: 44 },
  eyeBtn: { position: "absolute", right: 12, padding: 4 },
  signInBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
  },
  signInBtnDisabled: { backgroundColor: "#86efac" },
  signInBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

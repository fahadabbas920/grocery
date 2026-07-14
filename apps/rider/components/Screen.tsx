import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "@/theme";

interface ScreenProps {
  children: ReactNode;
  /** Which edges the safe-area inset should apply to. Defaults to all. */
  edges?: readonly Edge[];
  style?: ViewStyle;
}

/** Full-height screen wrapper with the app background and safe-area insets. */
export function Screen({ children, edges, style }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.inner, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1 },
});

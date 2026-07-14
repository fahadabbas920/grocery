import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, radius, spacing } from "@/theme";

type Variant = "primary" | "green" | "purple" | "danger" | "outline";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BG: Record<Variant, string> = {
  primary: colors.brand,
  green: colors.brand,
  purple: colors.purple,
  danger: colors.white,
  outline: colors.white,
};

const FG: Record<Variant, string> = {
  primary: colors.white,
  green: colors.white,
  purple: colors.white,
  danger: colors.danger,
  outline: colors.textSecondary,
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const fg = FG[variant];
  const isBordered = variant === "danger" || variant === "outline";

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: BG[variant] },
        isBordered && styles.bordered,
        variant === "danger" && { borderColor: colors.dangerBorder },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  bordered: { borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.6 },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontSize: fontSize.xl, fontWeight: "700" },
});

import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, radius, spacing } from "@/theme";

interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  /** Leading icon inside the input. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Renders a show/hide toggle and masks input by default. */
  secure?: boolean;
}

/** Labeled input with an optional leading icon and password reveal toggle. */
export function TextField({ label, icon, secure = false, ...inputProps }: TextFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {icon ? (
          <Ionicons name={icon} size={16} color={colors.textFaint} style={styles.icon} />
        ) : null}
        <TextInput
          style={[styles.input, secure && styles.inputSecure]}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={secure && !show}
          {...inputProps}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setShow((v) => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={show ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.textFaint}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs + 2 },
  label: { fontSize: fontSize.md, fontWeight: "600", color: colors.textSecondary },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.inputBg,
  },
  icon: { paddingLeft: spacing.md },
  input: { flex: 1, padding: spacing.md, fontSize: fontSize.lg, color: colors.text },
  inputSecure: { paddingRight: 44 },
  eyeBtn: { position: "absolute", right: spacing.md, padding: spacing.xs },
});

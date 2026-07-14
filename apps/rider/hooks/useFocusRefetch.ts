import { useCallback } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Runs `loadFn` every time the screen regains focus (in addition to mount), so
 * lists refresh after navigating back from an action (e.g. Start / Deliver).
 * `loadFn` should be stable (wrap it in `useCallback`).
 */
export function useFocusRefetch(loadFn: () => void | Promise<void>) {
  useFocusEffect(
    useCallback(() => {
      void loadFn();
    }, [loadFn]),
  );
}

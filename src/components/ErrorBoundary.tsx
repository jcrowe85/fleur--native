// src/components/ErrorBoundary.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  children: React.ReactNode;
  /** Reported to your crash pipeline. Wire this to Sentry/Crashlytics. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type State = { error: Error | null };

/**
 * Catches render-time crashes anywhere below it.
 *
 * The app previously had no boundary at all, so a single bad render — a
 * malformed cloud payload, an undefined array, a missing icon name — unmounted
 * the whole tree and left the user staring at a blank screen with no way back
 * except force-quitting.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    this.props.onError?.(error, info);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Sorry — the app hit an unexpected problem. Your data is safe.
        </Text>

        <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>

        {__DEV__ && (
          <ScrollView style={styles.debug} contentContainerStyle={{ padding: 12 }}>
            <Text style={styles.debugText}>{error.stack ?? String(error)}</Text>
          </ScrollView>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#120d0a",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  body: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  buttonText: { color: "#120d0a", fontWeight: "600" },
  debug: {
    marginTop: 24,
    maxHeight: 220,
    alignSelf: "stretch",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 8,
  },
  debugText: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "monospace" },
});

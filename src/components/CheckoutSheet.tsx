// src/components/CheckoutSheet.tsx
import React, { useCallback, useEffect, useRef } from "react";
import { Alert, Modal, Pressable, Text, View, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { WebView, type WebViewNavigation } from "react-native-webview";

type Props = {
  visible: boolean;
  url?: string;
  /** Called when the sheet is dismissed without a completed order. */
  onClose: () => void;
  /** Called exactly once when Shopify confirms the order. */
  onComplete?: (finalUrl: string) => void;
};

/**
 * Shopify's post-purchase URL.
 *
 * Shopify lands on `/checkouts/<token>/thank_you` (or `/orders/<id>` for some
 * storefronts) once payment succeeds. Matching on the *path* avoids the two
 * failure modes of the previous substring check
 * (`url.includes("order") || url.includes("success") || ...`):
 *
 *  - false positives, since "order" appears in ordinary in-checkout URLs and
 *    query strings, which fired completion before the customer had paid; and
 *  - false negatives, since it looked for "thank-you" with a hyphen while
 *    Shopify uses "thank_you", so real completions could be missed entirely.
 */
const COMPLETION_PATTERNS = [
  /\/thank_you\b/i,
  /\/thank-you\b/i,
  /\/orders\/[^/?#]+/i,
  /\/checkouts\/[^/?#]+\/(thank_you|post_purchase)/i,
];

function isOrderComplete(rawUrl: string): boolean {
  let pathname = rawUrl;
  try {
    pathname = new URL(rawUrl).pathname;
  } catch {
    // Non-absolute URL — fall back to matching the whole string.
  }
  return COMPLETION_PATTERNS.some((pattern) => pattern.test(pathname));
}

export default function CheckoutSheet({ visible, url, onClose, onComplete }: Props) {
  // Shopify fires several navigation events on the confirmation page; without
  // this latch onComplete ran repeatedly, debiting points more than once.
  const completedRef = useRef(false);

  // Arm a fresh latch for each new checkout URL.
  useEffect(() => {
    completedRef.current = false;
  }, [url]);

  const handleNavigation = useCallback(
    (navState: WebViewNavigation) => {
      if (completedRef.current || navState.loading) return;
      if (isOrderComplete(navState.url)) {
        completedRef.current = true;
        onComplete?.(navState.url);
      }
    },
    [onComplete]
  );

  const confirmClose = useCallback(() => {
    if (completedRef.current) {
      onClose();
      return;
    }
    Alert.alert(
      "Leave checkout?",
      "Your order isn't complete yet. If you leave now nothing will be charged.",
      [
        { text: "Keep shopping", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: onClose },
      ]
    );
  }, [onClose]);

  if (!visible || !url) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={confirmClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View
          style={{
            flex: 1,
            marginTop: 100,
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#f0f0f0",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#000" }}>
              Complete Purchase
            </Text>
            <Pressable
              onPress={confirmClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close checkout"
              style={{ padding: 8 }}
            >
              <Feather name="x" size={24} color="#666" />
            </Pressable>
          </View>

          <WebView
            source={{ uri: url }}
            style={{ flex: 1 }}
            onNavigationStateChange={handleNavigation}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator />
              </View>
            )}
            onError={(e) => console.warn("[checkout] webview error:", e.nativeEvent)}
            onHttpError={(e) => console.warn("[checkout] http error:", e.nativeEvent.statusCode)}
          />
        </View>
      </View>
    </Modal>
  );
}

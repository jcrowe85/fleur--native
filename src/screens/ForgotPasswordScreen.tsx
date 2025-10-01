// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/services/supabase";
import { CustomButton } from "@/components/UI/CustomButton";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'fleur://reset-password', // Deep link for mobile app
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      Alert.alert(
        "Reset Email Sent!",
        "Please check your email for a password reset link. The link will expire in 1 hour.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert(
        "Reset Failed",
        error.message || "Could not send reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        {/* Header with back button */}
        <View style={styles.headerWrap}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.headerTitle}>Reset Password</Text>
            <Text style={styles.headerSub}>We'll send you a reset link</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.content}>
          {!emailSent ? (
            <>
              <View style={styles.iconContainer}>
                <Feather name="lock" size={48} color="rgba(255,255,255,0.8)" />
              </View>

              <Text style={styles.instructionText}>
                Enter the email address associated with your account and we'll send you a link to reset your password.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your-email@example.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <CustomButton
                onPress={handleResetPassword}
                variant="wellness"
                fleurSize="default"
                disabled={loading || !email.trim()}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </CustomButton>

              <Pressable onPress={() => router.back()} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Feather name="mail" size={48} color="#4ade80" />
              </View>

              <Text style={styles.successTitle}>Check Your Email!</Text>
              <Text style={styles.successText}>
                We've sent a password reset link to:
              </Text>
              <Text style={styles.emailText}>{email}</Text>
              <Text style={styles.successText}>
                Click the link in the email to reset your password.
              </Text>

              <CustomButton
                onPress={() => router.back()}
                variant="wellness"
                fleurSize="default"
              >
                Back to Login
              </CustomButton>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#120d0a",
  },
  headerWrap: {
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 2,
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  instructionText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
  },
  cancelText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "600",
  },
  successTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  successText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 24,
  },
  emailText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
});


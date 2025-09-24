// src/screens/SupportChatScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from "react-native-reanimated";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { sendMessageToSlack, storeSupportMessage, getSupportMessages, checkForReplies, checkSupportTyping } from "@/services/slackService";
// import { ScreenScrollView } from "@/components/UI/bottom-space";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Animated typing dot component
function AnimatedDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    const startAnimation = () => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 400, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) })
        ),
        -1, // Infinite repeat
        false
      );
    };

    const timer = setTimeout(startAnimation, delay);
    return () => {
      clearTimeout(timer);
      // Don't stop animation on cleanup - let it continue
    };
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.typingDot, animatedStyle]} />;
}

export default function SupportChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSupportTyping, setIsSupportTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load existing messages and check for replies
  useEffect(() => {
    loadMessages();
    checkForNewReplies();
    checkForSupportTyping();
    
    // Check for new replies every 2 seconds, typing every 1 second for responsiveness
    const replyInterval = setInterval(checkForNewReplies, 2000);
    const typingInterval = setInterval(checkForSupportTyping, 1000);
    
    return () => {
      clearInterval(replyInterval);
      clearInterval(typingInterval);
    };
  }, []);

  const loadMessages = async () => {
    try {
      const dbMessages = await getSupportMessages();
      const formattedMessages = dbMessages
        .filter(msg => msg.message_text !== 'TYPING_INDICATOR') // Filter out typing indicators
        .map(msg => ({
          id: msg.id || Date.now().toString(),
          text: msg.message_text,
          isUser: msg.is_from_user,
          timestamp: new Date(msg.created_at || Date.now()),
        }));
      
      // Check if user has ever sent a message
      const hasUserMessages = formattedMessages.some(msg => msg.isUser);
      
      if (hasUserMessages) {
        // User has sent messages, show conversation history
        setMessages(formattedMessages);
      } else if (formattedMessages.length === 0) {
        // No messages at all, show welcome message
        setMessages([
          {
            id: "welcome-1",
            text: "Hi! I'm here to help with any questions about your hair care journey. How can I assist you today?",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      } else {
        // Only support messages exist, show them without welcome
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const checkForNewReplies = async () => {
    try {
      const replies = await checkForReplies();
      const newReplies = replies
        .filter(reply => reply.message_text !== 'TYPING_INDICATOR') // Filter out typing indicators
        .filter(reply => 
          !messages.some(msg => msg.id === reply.id)
        );
      
      if (newReplies.length > 0) {
        const formattedReplies = newReplies.map(reply => ({
          id: reply.id || Date.now().toString(),
          text: reply.message_text,
          isUser: false,
          timestamp: new Date(reply.created_at || Date.now()),
        }));
        
        setMessages(prev => {
          // Use a Set to ensure no duplicates by ID
          const existingIds = new Set(prev.map(msg => msg.id));
          const trulyNewReplies = formattedReplies.filter(reply => !existingIds.has(reply.id));
          
          // Clear typing indicator when real message arrives (with small delay)
          if (trulyNewReplies.length > 0) {
            setTimeout(() => {
              setIsSupportTyping(false);
            }, 500); // Small delay to ensure message is displayed
          }
          
          return [...prev, ...trulyNewReplies];
        });
        
        // Scroll to bottom when new reply arrives
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error("Error checking for replies:", error);
    }
  };

  const checkForSupportTyping = async () => {
    try {
      const isTyping = await checkSupportTyping();
      setIsSupportTyping(isTyping);
    } catch (error) {
      console.error("Error checking support typing:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Send message to Slack and store in database
      const slackSuccess = await sendMessageToSlack({
        text: userMessage.text,
        timestamp: userMessage.timestamp,
      });
      
      const dbSuccess = await storeSupportMessage(userMessage.text);
      
      // No auto-response needed - real support team will respond
      
      // Scroll to bottom after response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            onPress={() => router.back()} 
            style={styles.backButton}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={24} color="#fff" />
          </Pressable>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Support</Text>
            <Text style={styles.headerSubtitle}>We're here to help</Text>
          </View>
          
          <View style={styles.headerRight}>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>

        {/* Messages Container */}
        <View style={styles.messagesContainer}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.isUser ? styles.userMessageContainer : styles.botMessageContainer,
                  ]}
                >
                  <GlassCard style={[
                    styles.messageBubble,
                    message.isUser ? styles.userMessageBubble : styles.botMessageBubble,
                  ]}>
                    <Text style={[
                      styles.messageText,
                      message.isUser ? styles.userMessageText : styles.botMessageText,
                    ]}>
                      {message.text}
                    </Text>
                    <Text style={[
                      styles.messageTime,
                      message.isUser ? styles.userMessageTime : styles.botMessageTime,
                    ]}>
                      {formatTime(message.timestamp)}
                    </Text>
                  </GlassCard>
                </View>
              ))}
              
            {isSupportTyping && (
              <View style={styles.loadingContainer}>
                <View style={styles.typingIndicator}>
                  <AnimatedDot delay={0} />
                  <AnimatedDot delay={200} />
                  <AnimatedDot delay={400} />
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.inputContainer}>
            <View style={styles.composerRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your message..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={true}
                returnKeyType="default"
                blurOnSubmit={false}
              />
              <Pressable
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
                disabled={!inputText.trim()}
              >
                <Feather 
                  name="send" 
                  size={18} 
                  color={!inputText.trim() ? "rgba(255,255,255,0.3)" : "#fff"} 
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// Glass Card Component
function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
      <View style={styles.glassCardContent}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#120d0a",
  },
  safeArea: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  statusText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },

  // Chat
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  botMessageContainer: {
    alignItems: "flex-start",
  },

  // Glass Card
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  glassCardContent: {
    position: "relative",
    zIndex: 1,
  },

  // Message Bubbles
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
  },
  userMessageBubble: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  botMessageBubble: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: "#fff",
  },
  botMessageText: {
    color: "rgba(255,255,255,0.9)",
  },
  messageTime: {
    fontSize: 11,
    alignSelf: "flex-end",
  },
  userMessageTime: {
    color: "rgba(255,255,255,0.6)",
  },
  botMessageTime: {
    color: "rgba(255,255,255,0.5)",
  },

  // Loading
  loadingContainer: {
    alignItems: "flex-start",
    marginBottom: 12,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  // Input
  keyboardAvoidingView: {
    // No absolute positioning - let it flow naturally
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  composerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  textInput: {
    flex: 1,
    color: "#fff",
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
  },
});

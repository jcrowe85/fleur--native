// src/services/slackService.ts
import { supabase } from "./supabase";

interface SlackMessage {
  text: string;
  user_id?: string;
  timestamp: Date;
  channel?: string;
  thread_ts?: string;
}

interface SupportMessage {
  id?: string;
  user_id: string;
  message_text: string;
  is_from_user: boolean;
  slack_thread_ts?: string;
  slack_message_ts?: string;
  created_at?: string;
}

// NOTE: the Slack webhook URL is deliberately NOT in this file any more.
//
// It used to be read from EXPO_PUBLIC_SLACK_WEBHOOK_URL, which bakes it into
// the published JS bundle — anyone who unzips the IPA/APK can extract it and
// post arbitrary messages into your Slack workspace. Support messages now go to
// the `slack-webhook` Edge Function, which holds the URL server-side.
//
// ACTION REQUIRED: rotate the old webhook URL in Slack, since it has shipped.

// Get existing thread timestamp for a user
async function getExistingThread(userId: string): Promise<string | undefined> {
  try {
    const { data, error } = await supabase
      .from("support_messages")
      .select("slack_thread_ts")
      .eq("user_id", userId)
      .not("slack_thread_ts", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data.slack_thread_ts;
  } catch (error) {
    console.error("Error getting existing thread:", error);
    return undefined;
  }
}

export async function sendMessageToSlack(message: SlackMessage): Promise<boolean> {
  try {
    // Get user info from Supabase
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      console.warn("No authenticated user; cannot send support message");
      return false;
    }

    const userId = user.id;
    const userEmail = user.email || "unknown@example.com";

    // Check if we have an existing thread for this user
    const existingThread = await getExistingThread(userId);
    const threadTs = existingThread;
    
    // Relay through the Edge Function, which holds the webhook URL and derives
    // the identity from the caller's JWT.
    const { error } = await supabase.functions.invoke("slack-webhook", {
      body: {
        text: message.text,
        userEmail,
        threadTs,
        timestamp: message.timestamp.toISOString(),
      },
    });

    if (error) {
      console.error("Support relay failed:", error.message);
      return false;
    }

    // Store the message with thread information
    await storeSupportMessage(message.text, threadTs);
    
    console.log("Message sent to Slack successfully");
    return true;
  } catch (error) {
    console.error("Error sending message to Slack:", error);
    return false;
  }
}

// Store messages in Supabase with thread tracking
export async function storeSupportMessage(message: string, threadTs?: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      console.warn("No authenticated user found for storing support message");
      return false;
    }
    
    const { error } = await supabase
      .from("support_messages")
      .insert({
        user_id: user.id,
        message_text: message,
        is_from_user: true,
        slack_thread_ts: threadTs,
      });

    if (error) {
      console.error("Error storing support message:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error storing support message:", error);
    return false;
  }
}

// Get support messages for a user
export async function getSupportMessages(): Promise<SupportMessage[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      console.warn("No authenticated user found for support messages");
      return [];
    }
    
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Error fetching support messages:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching support messages:", error);
    return [];
  }
}

// Check for new replies from support team
export async function checkForReplies(): Promise<SupportMessage[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      console.log("No user found, skipping reply check");
      return [];
    }
    
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_from_user", false)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error checking for replies:", error);
      return [];
    }

    console.log("Found replies:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("Error checking for replies:", error);
    return [];
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("support_messages")
      .select("count")
      .limit(1);
    
    if (error) {
      console.error("Database test failed:", error);
      return false;
    }
    
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database test error:", error);
    return false;
  }
}

// Function to add a reply from support team (called by webhook)
export async function addSupportReply(
  userId: string, 
  message: string, 
  threadTs: string, 
  messageTs: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("support_messages")
      .insert({
        user_id: userId,
        message_text: message,
        is_from_user: false,
        slack_thread_ts: threadTs,
        slack_message_ts: messageTs,
      });

    if (error) {
      console.error("Error adding support reply:", error);
      return false;
    }

    console.log("Support reply added successfully");
    return true;
  } catch (error) {
    console.error("Error adding support reply:", error);
    return false;
  }
}

// Check if support team is typing
export async function checkSupportTyping(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;

    // Check for recent typing indicators in the database
    const { data, error } = await supabase
      .from("support_messages")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("is_from_user", false)
      .eq("message_text", "TYPING_INDICATOR") // Special message type for typing
      .gte("created_at", new Date(Date.now() - 10000).toISOString()) // Last 10 seconds
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking support typing:", error);
    return false;
  }
}

// Clear typing indicators from database
export async function clearTypingIndicators(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;

    const { error } = await supabase
      .from("support_messages")
      .delete()
      .eq("user_id", user.id)
      .eq("message_text", "TYPING_INDICATOR");

    if (error) {
      console.error("Error clearing typing indicators:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error clearing typing indicators:", error);
    return false;
  }
}

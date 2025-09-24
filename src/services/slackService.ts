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

// Slack webhook URL - replace with your new Slack App webhook URL
const SLACK_WEBHOOK_URL = process.env.EXPO_PUBLIC_SLACK_WEBHOOK_URL || "YOUR_NEW_APP_WEBHOOK_URL_HERE";

export async function sendMessageToSlack(message: SlackMessage): Promise<boolean> {
  try {
    if (!SLACK_WEBHOOK_URL) {
      console.warn("Slack webhook URL not configured");
      return false;
    }

    // Get user info from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || "anonymous";
    const userEmail = user?.email || "unknown@example.com";

    // Generate unique thread timestamp for this conversation
    // Use current timestamp in Slack's expected format
    const threadTs = (message.timestamp.getTime() / 1000).toString();
    
    // Format message for Slack (simplified for incoming webhook)
    const slackPayload = {
      text: `New support message from ${userEmail}:`,
      attachments: [
        {
          color: "good",
          fields: [
            {
              title: "User ID",
              value: userId,
              short: true,
            },
            {
              title: "Email", 
              value: userEmail,
              short: true,
            },
            {
              title: "Message",
              value: message.text,
              short: false,
            },
            {
              title: "Thread ID",
              value: threadTs,
              short: true,
            },
            {
              title: "Timestamp",
              value: message.timestamp.toISOString(),
              short: true,
            },
          ],
        },
      ],
    };

    console.log("Sending to Slack webhook:", SLACK_WEBHOOK_URL);
    console.log("Webhook URL starts with:", SLACK_WEBHOOK_URL?.substring(0, 50) + "...");
    console.log("Slack payload:", JSON.stringify(slackPayload, null, 2));

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Slack webhook error response:", errorText);
      throw new Error(`Slack webhook failed: ${response.status} - ${errorText}`);
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
    
    const { error } = await supabase
      .from("support_messages")
      .insert({
        user_id: user?.id,
        message_text: message,
        is_from_user: true,
        slack_thread_ts: threadTs,
      });

    if (error) {
      console.error("Error storing support message:", error);
      return false;
    }

    console.log("Support message stored successfully");
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
    
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", user?.id)
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

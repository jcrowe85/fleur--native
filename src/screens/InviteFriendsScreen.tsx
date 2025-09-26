// src/screens/InviteFriendsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Contacts from "expo-contacts";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useRewardsStore } from "@/state/rewardsStore";
import { onReferralConfirmed } from "@/services/rewards";
import RewardsPill from "@/components/UI/RewardsPill";
import { generateReferralCode, createInviteMessage } from "@/utils/referralUtils";
import FriendReferredPopup from "@/components/FriendReferredPopup";

type Contact = {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
  selected: boolean;
};

// APP_LINK is now generated dynamically with referral codes

export default function InviteFriendsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [invitedContacts, setInvitedContacts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [lastReferredFriend, setLastReferredFriend] = useState<string | null>(null);
  const [popupPointsEarned, setPopupPointsEarned] = useState(0);

  const referralCount = useRewardsStore((s) => s.referralCount);
  const maxReferrals = 20;
  const remainingReferrals = maxReferrals - referralCount;

  useEffect(() => {
    requestContactsPermission();
    loadInvitedContacts();
  }, []);

  // Load invited contacts from AsyncStorage
  const loadInvitedContacts = async () => {
    try {
      const invitedContactsJson = await AsyncStorage.getItem('invitedContacts');
      if (invitedContactsJson) {
        const invitedContactsArray = JSON.parse(invitedContactsJson);
        setInvitedContacts(new Set(invitedContactsArray));
      }
    } catch (error) {
      console.error('Error loading invited contacts:', error);
    }
  };

  // Save invited contacts to AsyncStorage
  const saveInvitedContacts = async (invitedSet: Set<string>) => {
    try {
      const invitedArray = Array.from(invitedSet);
      await AsyncStorage.setItem('invitedContacts', JSON.stringify(invitedArray));
    } catch (error) {
      console.error('Error saving invited contacts:', error);
    }
  };

  // Clean up popup state when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      setShowReferralPopup(false);
      setLastReferredFriend(null);
      setPopupPointsEarned(0);
    };
  }, []);

  const requestContactsPermission = async () => {
    try {
      setPermissionRequested(true);
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
        setPermissionGranted(true);
        loadContacts();
      } else {
        console.log("Contacts permission denied, user can still use manual sharing");
        // Don't show alert, just allow manual sharing
      }
    } catch (error) {
      console.error("Error requesting contacts permission:", error);
      // Fallback to manual sharing only
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        sort: Contacts.SortTypes.FirstName,
      });

      const formattedContacts: Contact[] = data
        .filter((contact) => contact.name && (contact.phoneNumbers?.length || contact.emails?.length))
        .slice(0, 100) // Limit to first 100 contacts for performance
        .map((contact) => ({
          id: contact.id || Math.random().toString(),
          name: contact.name || "Unknown",
          phoneNumbers: contact.phoneNumbers?.map((p) => p.number),
          emails: contact.emails?.map((e) => e.email),
          selected: false,
        }));

      console.log(`Loaded ${formattedContacts.length} contacts`);
      setContacts(formattedContacts);
    } catch (error) {
      console.error("Error loading contacts:", error);
      // Don't show alert, just continue with manual sharing
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (contactId: string) => {
    // Prevent selecting already invited contacts
    if (invitedContacts.has(contactId)) {
      Alert.alert(
        "Already Invited",
        "This person has already been invited. You can only invite each person once."
      );
      return;
    }

    if (selectedContacts.size >= remainingReferrals && !selectedContacts.has(contactId)) {
      Alert.alert(
        "Limit Reached",
        `You can only invite ${remainingReferrals} more friends (${maxReferrals} total limit).`
      );
      return;
    }

    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const sendInvites = async () => {
    if (selectedContacts.size === 0) {
      Alert.alert("No Selection", "Please select at least one friend to invite.");
      return;
    }

    const selectedContactData = contacts.filter((c) => selectedContacts.has(c.id));
    
    try {
      for (const contact of selectedContactData) {
        // Generate unique referral code for this contact
        const referralCode = generateReferralCode();
        const message = createInviteMessage(referralCode, contact.name);
        
        console.log(`Sending invite to ${contact.name} with referral code: ${referralCode}`);
        
        // Try to send via SMS if phone number available
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          const phoneNumber = contact.phoneNumbers[0];
          const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
          
          try {
            await Linking.openURL(smsUrl);
          } catch (error) {
            console.error("Error sending SMS:", error);
          }
        }
        
        // Award points for each referral (Phase 1: immediate reward)
        const result = onReferralConfirmed({ 
          contactName: contact.name,
          referralCode: referralCode,
          contactId: contact.id
        });
        if (result.ok) {
          console.log(`Points awarded for referring ${contact.name} with code ${referralCode}`);
        }
      }

      // Show the referral popup instead of alert
      if (selectedContacts.size === 1) {
        const friendName = selectedContactData[0]?.name;
        setLastReferredFriend(friendName);
      } else {
        setLastReferredFriend(null); // Multiple friends, don't show specific name
      }
      setPopupPointsEarned(selectedContacts.size * 20);
      setShowReferralPopup(true);
      
      // Move selected contacts to invited list
      setInvitedContacts((prev) => {
        const newSet = new Set(prev);
        selectedContacts.forEach(contactId => newSet.add(contactId));
        // Save to AsyncStorage
        saveInvitedContacts(newSet);
        return newSet;
      });
      
      // Clear selected contacts after showing popup
      setSelectedContacts(new Set());
    } catch (error) {
      console.error("Error sending invites:", error);
      Alert.alert("Error", "Failed to send some invites. Please try again.");
    }
  };

  const shareManually = async () => {
    try {
      // Generate referral code for manual share
      const referralCode = generateReferralCode();
      const message = createInviteMessage(referralCode);
      const referralLink = `https://fleur.app/download?ref=${referralCode}`;
      
      console.log(`Manual share with referral code: ${referralCode}`);
      
      await Share.share({
        message,
        url: referralLink,
        title: "Check out Fleur!",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, position: "relative" }}>
            <Pressable onPress={() => router.push("/(app)/rewards")} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Invite Friends</Text>
              <Text style={styles.headerSubtitle}>Earn 20 points per friend</Text>
            </View>
            <View style={[styles.rewardsPillContainer, { padding: 8, borderRadius: 20 }]}>
              <RewardsPill compact />
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Referral Progress</Text>
              <Text style={styles.progressCount}>
                {referralCount}/{maxReferrals}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(referralCount / maxReferrals) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {remainingReferrals} referrals remaining
            </Text>
          </View>

          {/* Primary: Manual Share */}
          <View style={styles.primaryShareCard}>
            <View style={styles.primaryShareHeader}>
              <View style={styles.primaryShareIcon}>
                <Feather name="share-2" size={24} color="#fff" />
              </View>
              <View style={styles.primaryShareContent}>
                <Text style={styles.primaryShareTitle}>Share with Friends</Text>
                <Text style={styles.primaryShareSubtitle}>
                  Send your unique referral link via Messages, WhatsApp, or any app
                </Text>
              </View>
            </View>
            <Pressable style={styles.primaryShareButton} onPress={shareManually}>
              <Feather name="send" size={20} color="#2d241f" />
              <Text style={styles.primaryShareButtonText}>Share App Link</Text>
            </Pressable>
            <Text style={styles.primaryShareNote}>
              Earn 20 points when your friend downloads the app
            </Text>
          </View>

          {/* Secondary: Contact Import */}
          <View style={styles.secondarySection}>
            <View style={styles.secondaryHeader}>
              <Text style={styles.secondaryTitle}>Want to invite multiple friends?</Text>
              <Text style={styles.secondarySubtitle}>
                Import your contacts to select and invite several friends at once
              </Text>
            </View>
            
            {!permissionGranted ? (
              <Pressable style={styles.secondaryButton} onPress={requestContactsPermission}>
                <Feather name="users" size={18} color="#fff" />
                <Text style={styles.secondaryButtonText}>
                  {permissionRequested ? "Try Again" : "Import Contacts"}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.contactsSection}>
                <View style={styles.contactsHeader}>
                  <View style={styles.contactsHeaderTop}>
                    <View>
                      <Text style={styles.contactsTitle}>Select Friends</Text>
                      <Text style={styles.contactsSubtitle}>
                        Choose up to {remainingReferrals} friends
                      </Text>
                    </View>
                    <Pressable style={styles.importMoreButton} onPress={loadContacts}>
                      <Feather name="refresh-cw" size={16} color="#fff" />
                      <Text style={styles.importMoreButtonText}>Import More</Text>
                    </Pressable>
                  </View>
                </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading contacts...</Text>
                </View>
              ) : (
                <View style={styles.contactsList}>
                  {contacts.length === 0 ? (
                    <View style={styles.emptyContactsContainer}>
                      <Feather name="users" size={32} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.emptyContactsTitle}>No Contacts Found</Text>
                      <Text style={styles.emptyContactsSubtitle}>
                        No contacts with phone numbers or emails were found. You can still invite friends manually using the share button above.
                      </Text>
                      <Pressable style={styles.retryButton} onPress={loadContacts}>
                        <Feather name="refresh-cw" size={16} color="#fff" />
                        <Text style={styles.retryButtonText}>Refresh Contacts</Text>
                      </Pressable>
                    </View>
                  ) : (
                    contacts.map((contact) => {
                    const isInvited = invitedContacts.has(contact.id);
                    const isSelected = selectedContacts.has(contact.id);
                    
                    return (
                      <Pressable
                        key={contact.id}
                        style={[
                          styles.contactItem,
                          isSelected && styles.contactItemSelected,
                          isInvited && styles.contactItemInvited,
                        ]}
                        onPress={() => toggleContact(contact.id)}
                        disabled={isInvited}
                      >
                      <View style={styles.contactInfo}>
                        <View style={styles.contactAvatar}>
                          <Text style={styles.contactAvatarText}>
                            {contact.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.contactDetails}>
                          <Text style={[
                            styles.contactName,
                            isInvited && styles.contactNameInvited
                          ]}>
                            {contact.name}
                            {isInvited && " (Invited)"}
                          </Text>
                          {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                            <Text style={[
                              styles.contactPhone,
                              isInvited && styles.contactPhoneInvited
                            ]}>
                              {contact.phoneNumbers[0]}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                          isInvited && styles.checkboxInvited,
                        ]}
                      >
                        {isSelected && (
                          <Feather name="check" size={16} color="#fff" />
                        )}
                        {isInvited && (
                          <Feather name="check-circle" size={16} color="rgba(255,255,255,0.6)" />
                        )}
                      </View>
                    </Pressable>
                  );
                })
                  )}
                </View>
              )}

              {selectedContacts.size > 0 && (
                <Pressable style={styles.inviteButton} onPress={sendInvites}>
                  <Text style={styles.inviteButtonText}>
                    Send Invites ({selectedContacts.size})
                  </Text>
                </Pressable>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Friend Referred Popup */}
      <FriendReferredPopup
        visible={showReferralPopup}
        onClose={() => {
          setShowReferralPopup(false);
          setLastReferredFriend(null);
          setPopupPointsEarned(0);
        }}
        friendName={lastReferredFriend}
        pointsEarned={popupPointsEarned}
        totalReferrals={referralCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Match Dashboard header
  headerWrap: {
    paddingTop: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  rewardsPillContainer: {
    position: "absolute",
    right: 16,
    top: -24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  progressCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  progressCount: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  progressText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  manualShareCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  manualShareHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  manualShareTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  manualShareDescription: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 12,
  },
  manualShareButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  manualShareButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Primary Share Card (Manual Sharing)
  primaryShareCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  primaryShareHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  primaryShareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  primaryShareContent: {
    flex: 1,
  },
  primaryShareTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  primaryShareSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
  },
  primaryShareButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  primaryShareButtonText: {
    color: "#2d241f",
    fontSize: 17,
    fontWeight: "700",
  },
  primaryShareNote: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Secondary Section (Contact Import)
  secondarySection: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  secondaryHeader: {
    marginBottom: 16,
  },
  secondaryTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  secondarySubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
  },
  contactsSection: {
    marginBottom: 20,
  },
  contactsHeader: {
    marginBottom: 12,
  },
  contactsHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  contactsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  contactsSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  importMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 6,
  },
  importMoreButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  contactsList: {
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  contactItemSelected: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactPhone: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  contactItemInvited: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
    opacity: 0.6,
  },
  contactNameInvited: {
    color: "rgba(255,255,255,0.6)",
  },
  contactPhoneInvited: {
    color: "rgba(255,255,255,0.4)",
  },
  checkboxInvited: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  inviteButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  inviteButtonText: {
    color: "#2d241f",
    fontSize: 16,
    fontWeight: "700",
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  importButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  retryButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContactsContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyContactsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyContactsSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
});

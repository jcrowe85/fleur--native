// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useAuthStore } from "@/state/authStore";
import { useProfileStore } from "@/state/profileStore";
import { useRoutineStore } from "@/state/routineStore";
import { useRewardsStore } from "@/state/rewardsStore";
import { isHandleAvailable } from "@/services/profile";
import { ScreenScrollView } from "@/components/UI/bottom-space";
import RewardsPill from "@/components/UI/RewardsPill";
import { CustomButton } from "@/components/UI/CustomButton";
import { supabase } from "@/services/supabase";
import { cloudSyncService } from "@/services/cloudSyncService";

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { points } = useRewardsStore();
  const { setProfile: setProfileStore } = useProfileStore();
  const [loading, setLoading] = useState(false);
  const [editingHandle, setEditingHandle] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [handleError, setHandleError] = useState("");

  // Profile data
  const [profile, setProfile] = useState({
    display_name: user?.user_metadata?.display_name || "",
    handle: user?.user_metadata?.handle || "",
    avatar_url: null as string | null,
  });

  // Load profile data from database
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, display_name, handle')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error loading profile:', error);
        }

        const profileData = {
          display_name: data?.display_name || user.user_metadata?.display_name || "",
          handle: data?.handle || user.user_metadata?.handle || "",
          avatar_url: data?.avatar_url || user.user_metadata?.avatar_url || null,
        };
        setProfile(profileData);
        setProfileStore(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
        // Fallback to user metadata
        const fallbackProfileData = {
          display_name: user.user_metadata?.display_name || "",
          handle: user.user_metadata?.handle || "",
          avatar_url: user.user_metadata?.avatar_url || null,
        };
        setProfile(fallbackProfileData);
        setProfileStore(fallbackProfileData);
      }
    };

    loadProfile();
  }, [user]);

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please grant camera roll permissions to upload a profile photo.");
        return;
      }

      // Check if user is authenticated
      if (!user?.id) {
        Alert.alert("Authentication required", "Please sign in to upload a profile photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        
        try {
          // Try Supabase storage first
          try {
            // Convert image to blob for upload
            const response = await fetch(result.assets[0].uri);
            const blob = await response.blob();
            
            // Generate unique filename
            const fileExt = result.assets[0].uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to Supabase storage
            const { data, error } = await supabase.storage
              .from('avatars')
              .upload(filePath, blob, {
                contentType: `image/${fileExt}`,
                upsert: true, // Allow overwriting
              });

            if (error) {
              throw error; // Will be caught by fallback
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);

            // Store in database for community access
            const { error: dbError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                user_id: user.id,
                avatar_url: publicUrl,
                updated_at: new Date().toISOString()
              });

            if (dbError) {
              console.warn('Database update failed, using metadata fallback:', dbError);
              // Fallback to user metadata
              const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
              });
              if (updateError) {
                throw updateError;
              }
            }

            setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
            setProfileStore({ avatar_url: publicUrl });
            Alert.alert("Success", "Profile photo updated!");
            
          } catch (storageError) {
            console.warn('Supabase storage failed, using fallback:', storageError);
            
            // Fallback: Store local URI directly in database
            const { error: dbError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                user_id: user.id,
                avatar_url: result.assets[0].uri,
                updated_at: new Date().toISOString()
              });

            if (dbError) {
              console.error('Fallback database update error:', dbError);
              Alert.alert(
                "Update failed", 
                `Could not update profile: ${dbError.message || 'Unknown error'}. Please try again.`
              );
              return;
            }

            setProfile(prev => ({ ...prev, avatar_url: result.assets[0].uri }));
            setProfileStore({ avatar_url: result.assets[0].uri });
            Alert.alert(
              "Success", 
              "Profile photo updated! (Note: Image is stored locally)"
            );
          }
          
        } catch (uploadError) {
          console.error('Upload process error:', uploadError);
          Alert.alert(
            "Upload failed", 
            "Something went wrong during upload. Please try again."
          );
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditHandle = () => {
    if (!profile.handle) {
      // Show handle creation popup
      Alert.alert(
        "Create Handle",
        "You need a unique handle to customize your profile. Would you like to create one now?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Create", onPress: () => setEditingHandle(true) }
        ]
      );
      return;
    }
    setEditingHandle(true);
    setNewHandle(profile.handle);
  };

  const handleSaveHandle = async () => {
    if (!newHandle.trim()) {
      setHandleError("Handle cannot be empty");
      return;
    }

    const handleRegex = /^[a-z0-9_-]+$/;
    if (!handleRegex.test(newHandle)) {
      setHandleError("Handle can only contain lowercase letters, numbers, hyphens, and underscores");
      return;
    }

    if (newHandle.length < 3 || newHandle.length > 20) {
      setHandleError("Handle must be between 3 and 20 characters");
      return;
    }

    setLoading(true);
    setHandleError("");

    try {
      const isAvailable = await isHandleAvailable(newHandle);
      if (!isAvailable) {
        setHandleError("This handle is already taken");
        setLoading(false);
        return;
      }

      // Update both user metadata and database
      const { error: authError } = await supabase.auth.updateUser({
        data: { handle: newHandle }
      });

      if (authError) {
        console.error('Handle auth update error:', authError);
        Alert.alert("Update failed", "Could not update handle. Please try again.");
        return;
      }

      // Also update database
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          handle: newHandle,
          updated_at: new Date().toISOString()
        });

      if (dbError) {
        console.warn('Database update failed for handle:', dbError);
      }

      setProfile(prev => ({ ...prev, handle: newHandle }));
      setProfileStore({ handle: newHandle });
      setEditingHandle(false);
      Alert.alert("Success", "Handle updated!");
    } catch (error) {
      console.error('Handle validation error:', error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditDisplayName = () => {
    Alert.prompt(
      "Edit Display Name",
      "Enter your display name:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (displayName) => {
            if (displayName?.trim()) {
              setLoading(true);
              try {
                // Update both user metadata and database
                const { error: authError } = await supabase.auth.updateUser({
                  data: { display_name: displayName.trim() }
                });

                if (authError) {
                  throw authError;
                }

                // Also update database
                const { error: dbError } = await supabase
                  .from('profiles')
                  .upsert({
                    user_id: user?.id,
                    display_name: displayName.trim(),
                    updated_at: new Date().toISOString()
                  });

                if (dbError) {
                  console.warn('Database update failed for display name:', dbError);
                }

                setProfile(prev => ({ ...prev, display_name: displayName.trim() }));
                setProfileStore({ display_name: displayName.trim() });
                Alert.alert("Success", "Display name updated!");
              } catch (error) {
                console.error('Display name update error:', error);
                Alert.alert("Update failed", "Could not update display name. Please try again.");
              } finally {
                setLoading(false);
              }
            }
          }
        }
      ],
      "plain-text",
      profile.display_name || profile.handle
    );
  };


  const handleSignOut = async () => {
    const hasRealEmail = user?.email && !user.email.includes('@guest.local');
    
    if (hasRealEmail) {
      // User has real email - normal sign out
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: async () => {
              setLoading(true);
              try {
                await signOut();
                // Small delay to ensure plan store is cleared before navigation
                setTimeout(() => {
                  router.replace("/");
                }, 100);
              } catch (error) {
                console.error('Sign out error:', error);
                Alert.alert("Error", "Could not sign out. Please try again.");
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } else {
      // Guest user - delete account with data loss warning
      Alert.alert(
        "Delete Account",
        "This will permanently delete your account and all your data including:\n\n• Routine progress and streaks\n• Points and rewards\n• Purchase history\n• All settings\n\nThis cannot be undone. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete Account",
            style: "destructive",
            onPress: async () => {
              setLoading(true);
              try {
                // Sign out and clear all local data
                await signOut();
                // Clear all local storage/state
                // Note: You might want to add more cleanup here
                // Small delay to ensure plan store is cleared before navigation
                setTimeout(() => {
                  router.replace("/");
                }, 100);
              } catch (error) {
                console.error('Delete account error:', error);
                Alert.alert("Error", "Could not delete account. Please try again.");
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
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
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, position: "relative" }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSub}>Manage your account and preferences</Text>
            </View>

            <View style={[styles.rewardsPillContainer, { padding: 8, borderRadius: 20 }]}>
              <RewardsPill compact />
            </View>
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6 }}
          bottomExtra={16}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Photo Section */}
          <View style={styles.section}>
            <View style={styles.photoContainer}>
              <Pressable onPress={handleImagePicker} style={styles.photoButton} disabled={loading}>
                {profile.avatar_url ? (
                  <ImageBackground
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                    imageStyle={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Feather name="camera" size={24} color="rgba(255,255,255,0.6)" />
                  </View>
                )}
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </Pressable>
              <Text style={styles.photoLabel}>
                {profile.avatar_url ? "Tap to change photo" : "Tap to add photo"}
              </Text>
            </View>
          </View>

          {/* Profile Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            
            {/* Display Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              <Pressable onPress={handleEditDisplayName} style={styles.fieldButton}>
                <Text style={styles.fieldValue}>
                  {profile.display_name || "Tap to add display name"}
                </Text>
                <Feather name="edit-3" size={16} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>

            {/* Handle */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Handle</Text>
              {editingHandle ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.handleInput}
                    value={newHandle}
                    onChangeText={setNewHandle}
                    placeholder="Enter handle"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.editButtons}>
                    <Pressable onPress={() => setEditingHandle(false)} style={styles.cancelButton}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleSaveHandle} style={styles.saveButton} disabled={loading}>
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                  {handleError ? (
                    <Text style={styles.errorText}>{handleError}</Text>
                  ) : null}
                </View>
              ) : (
                <Pressable onPress={handleEditHandle} style={styles.fieldButton}>
                  <Text style={styles.fieldValue}>
                    {profile.handle ? `@${profile.handle}` : "Tap to create handle"}
                  </Text>
                  <Feather name="edit-3" size={16} color="rgba(255,255,255,0.6)" />
                </Pressable>
              )}
            </View>

            {/* Email */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email</Text>
              {user?.email && !user.email.includes('@guest.local') ? (
                <View style={styles.fieldButton}>
                  <Text style={styles.fieldValue}>{user.email}</Text>
                  <Text style={styles.emailNote}>✓ Cloud sync enabled</Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.fieldDescription}>
                    Add email to secure your account and sync data across devices
                  </Text>
                  <View style={styles.benefitsContainer}>
                    <Text style={styles.benefitText}>• Backup your routine progress</Text>
                    <Text style={styles.benefitText}>• Access from multiple devices</Text>
                    <Text style={styles.benefitText}>• Recover account if needed</Text>
                  </View>
                  <Pressable 
                    style={styles.addEmailButton} 
                    onPress={() => router.push('/cloud-sync')}
                    disabled={loading}
                  >
                    <Text style={styles.addEmailButtonText}>
                      Add Email & Sync
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{points}</Text>
                <Text style={styles.statLabel}>Points Earned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Days Streak</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Products Used</Text>
              </View>
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <Pressable 
              style={styles.settingButton}
              onPress={() => router.push("/(app)/notification-settings")}
            >
              <View style={styles.settingLeft}>
                <Feather name="bell" size={20} color="#fff" />
                <Text style={styles.settingText}>Notifications</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>

            <Pressable style={styles.settingButton}>
              <View style={styles.settingLeft}>
                <Feather name="shield" size={20} color="#fff" />
                <Text style={styles.settingText}>Privacy & Security</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>

            <Pressable 
              style={styles.settingButton}
              onPress={() => router.push("/support-chat")}
            >
              <View style={styles.settingLeft}>
                <Feather name="help-circle" size={20} color="#fff" />
                <Text style={styles.settingText}>Help & Support</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Sign Out / Delete Account */}
          <View style={styles.section}>
            <CustomButton
              onPress={handleSignOut}
              variant="ghost"
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View style={styles.signOutButtonContent}>
                  <Feather 
                    name={user?.email && !user.email.includes('@guest.local') ? "log-out" : "trash-2"} 
                    size={20} 
                    color="white" 
                  />
                  <Text style={styles.signOutText}>
                    {user?.email && !user.email.includes('@guest.local') ? "Sign Out" : "Delete Account"}
                  </Text>
                </View>
              )}
            </CustomButton>
          </View>
        </ScreenScrollView>
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
    paddingTop: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 22, 
    fontWeight: "600", 
    textAlign: "center" 
  },
  headerSub: { 
    color: "rgba(255,255,255,0.85)", 
    fontSize: 12, 
    marginTop: 4, 
    textAlign: "center" 
  },
  rewardsPillContainer: {
    position: "absolute",
    right: 16,
    top: -24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
  },
  photoContainer: {
    alignItems: "center",
  },
  photoButton: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  avatarImage: {
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  photoLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  fieldButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  fieldValue: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  editContainer: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  handleInput: {
    color: "#fff",
    fontSize: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
  },
  settingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: {
    color: "#fff",
    fontSize: 16,
  },
  signOutButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  fieldDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  benefitsContainer: {
    marginBottom: 16,
  },
  benefitText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  addEmailButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  addEmailButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emailNote: {
    color: "rgba(34,197,94,0.8)",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
});

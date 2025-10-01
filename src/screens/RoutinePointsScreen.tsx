// src/screens/RoutinePointsScreen.tsx
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useRewardsStore } from "@/state/rewardsStore";
import { ScreenScrollView } from "@/components/UI/bottom-space";
import dayjs from "dayjs";

/* ---------------- screen ---------------- */

export default function RoutinePointsScreen() {
  const ledger = useRewardsStore((s) => s.ledger);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter routine points from ledger (both increments and decrements)
  const routinePoints = useMemo(() => {
    return ledger.filter(item => 
      item.reason === "daily_routine_task" || 
      item.reason === "daily_routine_task_reversed"
    ).sort((a, b) => b.ts - a.ts); // Most recent first
  }, [ledger]);

  // Pagination logic
  const totalPages = Math.ceil(routinePoints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = routinePoints.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    return dayjs(timestamp).format("MMM D, YYYY");
  };

  // Format time for display
  const formatTime = (timestamp: number) => {
    return dayjs(timestamp).format("h:mm A");
  };

  // Render individual point item
  const renderPointItem = ({ item }: { item: any }) => {
    const isPositive = item.delta >= 0;
    const iconName = isPositive ? "arrow-up-right" : "arrow-down-right";
    const iconColor = isPositive ? "#4ade80" : "#f87171";
    const pointColor = isPositive ? "#4ade80" : "#f87171";
    const actionLabel = isPositive ? "Routine task completed" : "Routine task undone";
    
    return (
      <View style={styles.pointItem}>
        <View style={styles.pointHeader}>
          <View style={styles.pointIcon}>
            <Feather name={iconName} size={16} color={iconColor} />
          </View>
          <Text style={[styles.pointValue, { color: pointColor }]}>
            {isPositive ? `+${item.delta}` : item.delta} point{Math.abs(item.delta) !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <Text style={styles.taskName}>{actionLabel}</Text>
        
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeItem}>
            <Feather name="calendar" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={styles.dateTimeText}>{formatDate(item.ts)}</Text>
          </View>
          <View style={styles.dateTimeItem}>
            <Feather name="clock" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={styles.dateTimeText}>{formatTime(item.ts)}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <Pressable
          onPress={goToPrevPage}
          style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
          disabled={currentPage === 1}
        >
          <Feather name="chevron-left" size={16} color={currentPage === 1 ? "rgba(255,255,255,0.3)" : "#fff"} />
        </Pressable>

        <View style={styles.pageNumbers}>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Pressable
                key={pageNum}
                onPress={() => goToPage(pageNum)}
                style={[
                  styles.pageBtn,
                  currentPage === pageNum && styles.pageBtnActive
                ]}
              >
                <Text style={[
                  styles.pageBtnText,
                  currentPage === pageNum && styles.pageBtnTextActive
                ]}>
                  {pageNum}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={goToNextPage}
          style={[styles.paginationBtn, currentPage === totalPages && styles.paginationBtnDisabled]}
          disabled={currentPage === totalPages}
        >
          <Feather name="chevron-right" size={16} color={currentPage === totalPages ? "rgba(255,255,255,0.3)" : "#fff"} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#120d0a" }}>
      <ImageBackground
        source={require("../../assets/dashboard.png")}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />

      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{ padding: 8, borderRadius: 20 }}
            >
              <Feather name="arrow-left" size={18} color="#fff" />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerTitle}>Routine Points</Text>
              <Text style={styles.headerSub}>Your earned routine points history</Text>
            </View>

            <View style={{ width: 34 }} />
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6 }}
          bottomExtra={20}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Net Routine Points</Text>
            <Text style={styles.summaryValue}>
              {routinePoints.reduce((sum, item) => sum + item.delta, 0)}
            </Text>
            <Text style={styles.summarySubtext}>
              {routinePoints.filter(item => item.delta > 0).length} earned • {routinePoints.filter(item => item.delta < 0).length} removed
            </Text>
          </View>

          {/* Points List */}
          {routinePoints.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="target" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>No routine points yet</Text>
              <Text style={styles.emptySubtext}>
                Complete routine tasks to start earning points!
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Recent Points ({startIndex + 1}-{Math.min(endIndex, routinePoints.length)} of {routinePoints.length})
                </Text>
              </View>

              <View style={styles.pointsList}>
                {currentItems.map((item, index) => (
                  <View key={`${item.id}-${index}`}>
                    {renderPointItem({ item })}
                  </View>
                ))}
              </View>

              {/* Pagination */}
              {renderPagination()}
            </>
          )}
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  // Header styling
  headerWrap: {
    paddingTop: 32,
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

  // Summary card
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  summaryTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  summarySubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },

  // Section header
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Points list
  pointsList: {
    gap: 8,
    marginBottom: 20,
  },

  // Point item
  pointItem: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    padding: 12,
  },
  pointHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  pointIcon: {
    marginRight: 8,
  },
  pointValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  taskName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 16,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateTimeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },

  // Pagination
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  paginationBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  paginationBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  pageNumbers: {
    flexDirection: "row",
    gap: 4,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  pageBtnActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  pageBtnText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  pageBtnTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

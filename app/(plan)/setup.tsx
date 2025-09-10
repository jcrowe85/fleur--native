import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { fetchPlan } from "@/services/planClient";
import { useAnswersStore } from "@/state/answersStore";
import { usePlanStore } from "@/state/planStore";

export default function Setup() {
  const { answers } = useAnswersStore();
  const { setPlan } = usePlanStore();
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let canceled = false;

    async function run() {
      try {
        const planPromise = fetchPlan({
          persona: (answers.persona ?? "general") as any,
          hairType: answers.hairType ?? "unknown",
          washFreq: answers.washFreq ?? "unknown",
          goals: answers.goals?.length ? answers.goals : ["general improvement"],
          constraints: answers.constraints,
        });

        // keep your 15s UX while plan builds
        await Promise.all([planPromise.then(p => !canceled && setPlan(p)), wait(15000)]);

        if (!canceled) router.replace("/(plan)/summary");
      } catch (e: any) {
        if (!canceled) setError(e.message ?? "Something went wrong");
      }
    }

    run();
    return () => { canceled = true; };
  }, []);

  return (
    <View className="flex-1 items-center justify-center">
      {error ? (
        <Text className="text-white">Error: {error}</Text>
      ) : (
        <>
          <ActivityIndicator />
          <Text className="text-white/80 mt-2">Setting up your plan…</Text>
        </>
      )}
    </View>
  );
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

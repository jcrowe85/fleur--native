import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, ImageBackground, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CustomButton } from '@/components/UI/CustomButton';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing as ReEasing,
} from 'react-native-reanimated';

const SCROLL_TEXT =
  'Peptide Science     Natural Wellness     Personal Care     '.repeat(6);

// Feel tuning — adjust if you want
const PX_PER_SEC = 60;       // constant speed (px/sec)
const MIN_LOOP_MS = 12000;   // never faster than this per loop

export default function Welcome() {
  const x = useSharedValue(0);
  const [textW, setTextW] = useState<number | null>(null);

  // Measure the intrinsic width of one copy of the text without impacting layout
  const handleMeasure = (e: any) => {
    const lines = e?.nativeEvent?.lines;
    // lines[0].width is the *intrinsic* width of the single line (not clamped by container)
    const wFromLines = Array.isArray(lines) && lines[0]?.width ? Math.ceil(lines[0].width) : 0;
    if (wFromLines > 0 && wFromLines !== textW) setTextW(wFromLines);
  };

  useEffect(() => {
    if (!textW) return;
    cancelAnimation(x);
    x.value = 0;

    const duration = Math.max(MIN_LOOP_MS, Math.round((textW / PX_PER_SEC) * 1000));

    // move exactly one text-width, loop forever
    x.value = withRepeat(
      withTiming(-textW, { duration, easing: ReEasing.linear }),
      -1, // infinite
      false
    );

    return () => cancelAnimation(x);
  }, [textW]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-brand-bg">
      {/* Background hero */}
      <ImageBackground
        source={require('../../assets/fleur-hero.png')}
        resizeMode="cover"
        className="absolute inset-0"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.30)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="absolute inset-0"
        />
      </ImageBackground>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-6 py-12">
        <View className="w-full max-w-md items-center">
          {/* Logo */}
          <View>
            <ImageBackground
              source={require('../../assets/logo.png')}
              resizeMode="contain"
              className="w-48 h-12"
            />
          </View>

          {/* Invisible measuring copy (on-screen, absolutely positioned, no layout impact) */}
          <Text
            numberOfLines={1}
            onTextLayout={handleMeasure}
            style={{
              position: 'absolute',
              opacity: 0,   // keeps it laid out but invisible
              left: 0,
              top: 0,
            }}
            accessible={false}
            pointerEvents="none"
          >
            {SCROLL_TEXT}
          </Text>

          {/* Scrolling text bar – seamless, single-line, no gap */}
          <View className="relative py-40 w-full" style={{ overflow: 'hidden' }}>
            {textW ? (
              <Animated.View
                key={textW} // clean reset on width changes (rotation/font-scale)
                style={[{ flexDirection: 'row' }, trackStyle]}
              >
                <Text
                  className="text-white/80 text-sm font-medium"
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {SCROLL_TEXT}
                </Text>
                <Text
                  className="text-white/80 text-sm font-medium"
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {SCROLL_TEXT}
                </Text>
              </Animated.View>
            ) : (
              // Initial render to preserve your spacing while we measure
              <Text
                className="text-white/80 text-sm font-medium"
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {SCROLL_TEXT}
              </Text>
            )}
          </View>

          {/* CTAs */}
          <View className="w-full items-center">
            <CustomButton
              variant="wellness"
              fleurSize="lg"
              className="w-full"
              onPress={() => router.push('/onboarding')}
            >
              Start Your Hair Journey
            </CustomButton>

            <CustomButton
              variant="ghost"
              fleurSize="lg"
              className="w-full mt-4"
              onPress={() => router.push('/dashboard')}
            >
              I already have an account
            </CustomButton>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

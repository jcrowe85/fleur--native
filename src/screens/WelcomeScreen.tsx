import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, View, ImageBackground, Text, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CustomButton } from '../../src/components/UI/CustomButton';

const SCROLL_TEXT =
  'Peptide Science     Natural Wellness     Personal Care     '.repeat(6);

export default function Welcome() {
  const translateX = useRef(new Animated.Value(0)).current;
  const [textW, setTextW] = useState(0);

  useEffect(() => {
    if (!textW) return;
    translateX.setValue(0);

    // Constant speed regardless of length
    const PX_PER_SEC = 10; // adjust speed here
    const duration = Math.ceil(textW / PX_PER_SEC) * 1000;

    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: -textW,          // move exactly one text-width
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [textW, translateX]);

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
          <View className="">
            <ImageBackground
              source={require('../../assets/logo.png')}
              resizeMode="contain"
              className="w-48 h-12"
            />
          </View>

          {/* Scrolling text bar – seamless, single-line, no gap */}
          <View className="relative py-40 w-full">
            {textW === 0 ? (
              // First render: measure width of one copy
              <Text
                className="text-white/80 text-sm font-medium"
                numberOfLines={1}
                ellipsizeMode="clip"
                onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
              >
                {SCROLL_TEXT}
              </Text>
            ) : (
              <Animated.View
                style={{ transform: [{ translateX }] }}
                className="flex-row"
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
            )}
          </View>

          {/* CTAs */}
          <View className=" w-full items-center">
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

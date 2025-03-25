import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const AnimatedImage = Animated.Image;
const AVATAR_SIZE = 64;
const RING_SIZE = AVATAR_SIZE + 16;

interface AnimatedAvatarProps {
  size?: number;
}

export default function AnimatedAvatar({ size = AVATAR_SIZE }: AnimatedAvatarProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Add a subtle bounce effect
    scale.value = withRepeat(
      withSpring(1.05, {
        damping: 2,
        stiffness: 80,
      }),
      -1,
      true
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ring,
          ringStyle,
          {
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
          },
        ]}
      />
      
      <Animated.View style={[styles.avatarContainer, { width: size, height: size }, avatarStyle]}>
        <AnimatedImage
          source={{ uri: 'https://images.unsplash.com/photo-1531987428847-95ad50737a07?q=80&w=1965&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
    opacity: 0.8,
    backgroundColor: 'transparent',
  },
  avatarContainer: {
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});
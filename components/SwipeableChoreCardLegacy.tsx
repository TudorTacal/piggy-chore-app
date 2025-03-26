import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Pencil, 
  Trash2, 
  Sparkles,
  Brush as Toothbrush,
  Droplets,
  Smile,
  BedDouble,
  UtensilsCrossed,
  Shirt 
} from 'lucide-react-native';
import type { Chore } from '@/types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const DELETE_THRESHOLD = SCREEN_WIDTH * 0.4;
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.5,
};

const TOUCH_SLOP = 5;
const TIME_TO_ACTIVATE_PAN = 400;
const touchStart = useSharedValue({ x: 0, y: 0, time: 0 });

const TASK_ICONS: Record<string, any> = {
  'Brush teeth': Toothbrush,
  'Wash hands': Droplets,
  'Wash your face': Smile,
  'Make the bed': BedDouble,
  'Clean the room': Sparkles,
  'Help with dishes': UtensilsCrossed,
  'Change clothes': Shirt,
  'Tidy up clothes': Shirt,
};

interface SwipeableChoreCardProps {
  chore: Chore;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isCompleted: boolean;
}

export default function SwipeableChoreCard({
  chore,
  onPress,
  onEdit,
  onDelete,
  isCompleted,
}: SwipeableChoreCardProps) {
  const translateX = useSharedValue(0);
  const cardHeight = useSharedValue(80);
  const cardOpacity = useSharedValue(1);
  const marginVertical = useSharedValue(8);
  const isGestureActive = useSharedValue(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const TaskIcon = TASK_ICONS[chore.title] || Sparkles;
  const gestureActive = useRef(false);

  const resetPosition = () => {
    'worklet';
    translateX.value = withSpring(0, SPRING_CONFIG);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    cardHeight.value = withTiming(0, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
    marginVertical.value = withTiming(0, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });
    cardOpacity.value = withTiming(0, {
      duration: 100,
      easing: Easing.inOut(Easing.ease),
    }, () => {
      runOnJS(onDelete)();
    });
  };

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .simultaneousWithExternalGesture(Gesture.Native()) 
    .onTouchesDown((e) => {
      touchStart.value = {
        x: e.changedTouches[0].x,
        y: e.changedTouches[0].y,
        time: Date.now(),
      };
    })
    .onTouchesMove((e, state) => {
      if (Date.now() - touchStart.value.time > TIME_TO_ACTIVATE_PAN) {
        state.activate();
      } else if (
        Math.abs(touchStart.value.x - e.changedTouches[0].x) > TOUCH_SLOP &&
        Math.abs(touchStart.value.y - e.changedTouches[0].y) < TOUCH_SLOP 
      ) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .onChange((event) => {
      if (!isDeleting) {
        const dx = event.translationX;
        const resistanceFactor = 0.7;
        translateX.value = dx * resistanceFactor;
      }
    })
    .onEnd((event) => {
      if (isDeleting) return;

      const velocity = event.velocityX;
      const isQuickSwipe = Math.abs(velocity) > 800;
      const shouldDelete = 
        event.translationX < -DELETE_THRESHOLD || 
        (isQuickSwipe && velocity < -800);

      if (shouldDelete) {
        translateX.value = withSequence(
          withSpring(-DELETE_THRESHOLD, { ...SPRING_CONFIG, stiffness: 400 }),
          withTiming(-SCREEN_WIDTH, { duration: 150, easing: Easing.inOut(Easing.ease) }, () => {
            runOnJS(handleDelete)();
          })
        );
      } else {
        resetPosition();
      }
    })
    .onFinalize(() => {
      isGestureActive.value = false;
      gestureActive.current = false;
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      if (!gestureActive.current && translateX.value === 0 && !isDeleting) {
        runOnJS(onPress)();
      } else {
        resetPosition();
      }
    });

  const composedGesture = Gesture.Exclusive(
    Gesture.Simultaneous(panGesture, tapGesture),
    Gesture.Pan()
  );

  const rContainerStyle = useAnimatedStyle(() => ({
    height: cardHeight.value,
    marginVertical: marginVertical.value,
    opacity: cardOpacity.value,
  }));

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rLeftActionStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, translateX.value / SWIPE_THRESHOLD));
    return {
      opacity: withTiming(opacity, { duration: 100 }),
      width: Math.max(0, translateX.value),
    };
  });

  const rRightActionStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, Math.min(1, -translateX.value / SWIPE_THRESHOLD));
    const progress = Math.min(1, -translateX.value / DELETE_THRESHOLD);
    const isNearDelete = progress > 0.8;
    
    return {
      opacity: withTiming(opacity, { duration: 100 }),
      width: Math.max(0, -translateX.value),
      backgroundColor: withTiming(
        isNearDelete ? '#B71C1C' : '#D32F2F',
        { duration: 100 }
      ),
    };
  });

  return (
    <Animated.View style={[styles.container, rContainerStyle]}>
      <View style={styles.cardWrapper}>
        <Animated.View style={[styles.actionContainer, styles.deleteContainer, rRightActionStyle]}>
          <View style={styles.actionContent}>
            <Trash2 color="white" size={24} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.actionContainer, styles.editContainer, rLeftActionStyle]}>
          <View style={styles.actionContent}>
            <Pencil color="white" size={24} />
          </View>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, rStyle]}>
            <LinearGradient
              colors={isCompleted ? ['#A5D6A7', '#81C784'] : ['#FF9800', '#F57C00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <View style={styles.content}>
                <View style={styles.taskInfo}>
                  <View style={styles.iconContainer}>
                    <TaskIcon 
                      size={24} 
                      color={isCompleted ? '#1B5E20' : '#fff'} 
                      style={styles.taskIcon}
                    />
                  </View>
                  <Text style={[
                    styles.taskTitle,
                    isCompleted && styles.taskTitleCompleted
                  ]}>{chore.title}</Text>
                </View>
                <View style={[
                  styles.coinsBox,
                  isCompleted && styles.coinsBoxCompleted
                ]}>
                  <Text style={[
                    styles.taskCoins,
                    isCompleted && styles.taskCoinsCompleted
                  ]}>£{chore.reward_amount.toFixed(2)}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
    height: 80,
  },
  cardWrapper: {
    position: 'relative',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    zIndex: 2,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: {
    opacity: 0.9,
  },
  taskTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.8,
  },
  coinsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  coinsBoxCompleted: {
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
  },
  taskCoins: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  taskCoinsCompleted: {
    color: '#1B5E20',
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  actionContent: {
    width: SWIPE_THRESHOLD,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteContainer: {
    right: 0,
    backgroundColor: '#D32F2F',
  },
  editContainer: {
    left: 0,
    backgroundColor: '#2196F3',
  },
});
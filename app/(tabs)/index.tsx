import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, ImageBackground } from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from '@/contexts/auth';
import { getChores, toggleChore, resetChores, createChore, updateChore, deleteChore } from '@/lib/api/chores';
import type { Chore } from '@/types/database';
import { Plus, RotateCcw, Sun, Moon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedAvatar from '@/components/AnimatedAvatar';
import RedeemModal from '@/components/RedeemModal';
import SuccessDialog from '@/components/SuccessDialog';
import SwipeableChoreCard from '@/components/SwipeableChoreCard';
import EditChoreModal from '@/components/EditChoreModal';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/933/933.wav';

export default function HomeScreen() {
  const { userInfo, selectChild } = useAuth();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<Chore | null>(null);
  const [routineType, setRoutineType] = useState<'morning' | 'evening'>('morning');
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const buttonScale = useSharedValue(1);
  const resetScale = useSharedValue(1);
  const switchScale = useSharedValue(1);
  const addScale = useSharedValue(1);

  useEffect(() => {
    const initAudio = async () => {
      try {
        if (Platform.OS !== 'web') {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
        }
      } catch (err) {
        console.error('Audio initialization error:', err);
      }
    };

    initAudio();
  }, []);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  useEffect(() => {
    loadChores();
  }, [userInfo?.selectedChild?.id, routineType]);

  const loadChores = async () => {
    if (!userInfo?.selectedChild?.id) {
      console.log('No selected child, skipping chores load');
      return;
    }

    try {
      console.log('Loading chores for child:', userInfo.selectedChild.id);
      setIsLoading(true);
      setError(null);
      const data = await getChores(userInfo.selectedChild.id, routineType);
      console.log('Chores loaded successfully:', data.length);
      setChores(data);
    } catch (err) {
      console.error('Error loading chores:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPounds = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const playSound = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      if (Platform.OS === 'web') {
        const audio = new Audio(SOUND_URL);
        audio.volume = 0.3;
        await audio.play();
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: SOUND_URL },
          { 
            shouldPlay: true,
            volume: 0.3,
          }
        );
        setSound(newSound);
      }
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  };

  const handleTaskComplete = async (chore: Chore) => {
    if (!userInfo?.selectedChild?.id) {
      console.log('No selected child, cannot complete task');
      return;
    }

    try {
      setError(null);
      console.log('Toggling chore:', chore.id, !chore.completion_status);
      const result = await toggleChore(chore.id, !chore.completion_status);
      console.log('Chore toggle result:', result);
      
      setChores(prevChores => 
        prevChores.map(c => 
          c.id === chore.id 
            ? { ...c, completion_status: result.completed }
            : c
        )
      );
      
      if (result.completed) {
        setLastCompletedTask(chore);
        setShowSuccessDialog(true);
        playSound().catch(console.error);
      }
      
      if (userInfo.selectedChild) {
        const updatedChild = {
          ...userInfo.selectedChild,
          child_balances: {
            amount: result.balance
          }
        };
        console.log('Updating child with new balance:', updatedChild);
        selectChild(updatedChild);
      }
    } catch (err) {
      console.error('Error toggling chore:', err);
      setError((err as Error).message);
    }
  };

  const handleAddChore = async () => {
    if (!userInfo?.selectedChild?.id) {
      console.log('No selected child, cannot add chore');
      return;
    }

    addScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );

    try {
      console.log('Creating new chore for child:', userInfo.selectedChild.id);
      const newChore = await createChore(userInfo.selectedChild.id, {
        title: 'New Task',
        reward_amount: 0.10,
        routine_type: routineType,
        is_custom: true
      });

      console.log('New chore created:', newChore);
      setChores(prev => [...prev, newChore]);
      setSelectedChore(newChore);
      setShowEditModal(true);
    } catch (err) {
      console.error('Error creating chore:', err);
      setError((err as Error).message);
    }
  };

  const handleEditChore = (chore: Chore) => {
    console.log('Editing chore:', chore.id);
    setSelectedChore(chore);
    setShowEditModal(true);
  };

  const handleDeleteChore = async (choreId: string) => {
    console.log('Deleting chore:', choreId);
    setChores(prev => prev.filter(c => c.id !== choreId));

    try {
      await deleteChore(choreId);
      console.log('Chore deleted successfully');
    } catch (err) {
      console.error('Error deleting chore:', err);
      setError((err as Error).message);
      loadChores();
    }
  };

  const handleChoreUpdate = async (choreId: string, updates: Partial<Chore>) => {
    try {
      console.log('Updating chore:', choreId, updates);
      const updatedChore = await updateChore(choreId, updates);
      setChores(prev => prev.map(c => c.id === choreId ? updatedChore : c));
    } catch (err) {
      console.error('Error updating chore:', err);
      setError((err as Error).message);
    }
  };

  const handleRedeemPress = () => {
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    setShowRedeemModal(true);
  };

  const handleResetTasks = async () => {
    if (!userInfo?.selectedChild?.id) {
      console.log('No selected child, cannot reset tasks');
      return;
    }

    resetScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );

    try {
      console.log('Resetting tasks for child:', userInfo.selectedChild.id);
      await resetChores(userInfo.selectedChild.id, routineType);
      await loadChores();
    } catch (err) {
      console.error('Error resetting chores:', err);
      setError((err as Error).message);
    }
  };

  const handleRoutineSwitch = () => {
    switchScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );
    setRoutineType(current => current === 'morning' ? 'evening' : 'morning');
  };

  const redeemButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: withTiming(userInfo?.selectedChild?.child_balances?.amount > 0 ? 1 : 0, { duration: 200 }),
  }));

  const resetButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resetScale.value }],
  }));

  const switchButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: switchScale.value }],
  }));

  const addButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  const selectedChildBalance = userInfo?.selectedChild?.child_balances?.amount ?? 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://preview.redd.it/sunny-field-scenery-ai-generated-1920x1080-v0-dswgwa3xqqib1.jpg?width=1080&crop=smart&auto=webp&s=4c74729cdf9ff8891d63e42e361ddf25417c0b46' }}
        style={styles.headerBackground}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)']}
          style={styles.headerOverlay}
        >
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <AnimatedAvatar size={64} />
              <Text style={[styles.name, styles.textShadow]}>
                Hi, {userInfo?.selectedChild?.name || 'there'}!
              </Text>
            </View>
          </View>

          <View style={styles.coinsContainer}>
            <Text style={[styles.coinsAmount, styles.textShadow]}>
              {formatPounds(selectedChildBalance)}
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.tasksSection}>
        <AnimatedPressable
          style={[styles.routineSwitch, switchButtonStyle]}
          onPress={handleRoutineSwitch}
        >
          {routineType === 'morning' ? (
            <>
              <Sun size={20} color="#FF9800" />
              <Text style={styles.routineSwitchText}>Morning Routine</Text>
            </>
          ) : (
            <>
              <Moon size={20} color="#5C6BC0" />
              <Text style={[styles.routineSwitchText, styles.eveningText]}>Evening Routine</Text>
            </>
          )}
        </AnimatedPressable>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadChores}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView 
            style={styles.tasksList}
            contentContainerStyle={styles.tasksListContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            bounces={true}
            alwaysBounceVertical={true}
            directionalLockEnabled={true}
            nestedScrollEnabled={true}
            removeClippedSubviews={true}
            overScrollMode="always"
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            {chores.map((chore) => (
              <SwipeableChoreCard
                key={chore.id}
                chore={chore}
                onPress={() => handleTaskComplete(chore)}
                onEdit={() => handleEditChore(chore)}
                onDelete={() => handleDeleteChore(chore.id)}
                isCompleted={chore.completion_status}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.bottomActions}>
          <View style={styles.buttonRow}>
            <AnimatedPressable 
              style={[styles.actionButton, styles.addButton, addButtonStyle]}
              onPress={handleAddChore}
            >
              <Plus size={16} color="#666" />
              <Text style={styles.actionButtonText}>Add</Text>
            </AnimatedPressable>

            <AnimatedPressable 
              style={[styles.actionButton, styles.resetButton, resetButtonStyle]}
              onPress={handleResetTasks}
            >
              <RotateCcw size={16} color="#666" />
              <Text style={styles.actionButtonText}>Reset</Text>
            </AnimatedPressable>

            {selectedChildBalance > 0 && (
              <AnimatedPressable
                style={[styles.redeemButton, redeemButtonStyle]}
                onPress={handleRedeemPress}
              >
                <Text style={styles.redeemButtonText}>Redeem 🎉</Text>
              </AnimatedPressable>
            )}
          </View>
        </View>
      </View>

      <RedeemModal
        visible={showRedeemModal}
        onClose={() => setShowRedeemModal(false)}
      />

      <SuccessDialog
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        name={userInfo?.selectedChild?.name || ''}
        amount={lastCompletedTask?.reward_amount ? lastCompletedTask.reward_amount * 100 : 0}
      />

      {selectedChore && (
        <EditChoreModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedChore(null);
          }}
          onSave={handleChoreUpdate}
          chore={selectedChore}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F3E8',
  },
  headerBackground: {
    width: '100%',
  },
  headerOverlay: {
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinsContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
    paddingVertical: 20,
  },
  coinsAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tasksSection: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    marginTop: -30,
  },
  routineSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  routineSwitchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  eveningText: {
    color: '#5C6BC0',
  },
  tasksList: {
    flex: 1,
  },
  tasksListContent: {
    padding: 20,
    paddingBottom: 50,
  },
  bottomActions: {
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  addButton: {
    backgroundColor: '#E8F5E9',
  },
  resetButton: {
    backgroundColor: '#f5f5f5',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
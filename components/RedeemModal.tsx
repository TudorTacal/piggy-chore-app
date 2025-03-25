import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { resetBalance } from '@/lib/api/balance';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface RedeemModalProps {
  visible: boolean;
  onClose: () => void;
}

const CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Coral
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#9C27B0', // Purple
  '#FF9800', // Orange
];

export default function RedeemModal({ visible, onClose }: RedeemModalProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const { userInfo, selectChild } = useAuth();
  const [isConfirming, setIsConfirming] = useState(true);
  const [amountToRedeem, setAmountToRedeem] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setIsConfirming(true);
      setError(null);
      
      // Get current balance
      const currentBalance = userInfo?.selectedChild?.child_balances?.amount || 0;
      setAmountToRedeem(currentBalance);

      // Animate modal in
      scale.value = withSpring(1, { 
        damping: 15,
        stiffness: 100,
      });
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.ease,
      });
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (!userInfo?.selectedChild?.id) return;

    try {
      setError(null);
      
      // Store the amount before resetting
      const amountBeingRedeemed = amountToRedeem;
      
      // Reset balance in database
      await resetBalance(userInfo.selectedChild.id);
      
      // Show success state with original amount
      setIsConfirming(false);
      
      // Update child's balance in context
      if (userInfo.selectedChild) {
        selectChild({
          ...userInfo.selectedChild,
          child_balances: {
            amount: 0
          }
        });
      }
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        handleClose();
      }, 5000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleClose = () => {
    // Animate out
    scale.value = withTiming(0, {
      duration: 200,
      easing: Easing.ease,
    });
    opacity.value = withTiming(0, {
      duration: 200,
      easing: Easing.ease,
    });
    
    // Wait for animation before closing
    setTimeout(() => {
      onClose();
      // Reset state after modal is closed
      setIsConfirming(true);
      setError(null);
    }, 300);
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Create confetti pieces with improved animation
  const confettiPieces = Array(30).fill(0).map((_, i) => {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const rotate = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
      if (visible && !isConfirming) {
        const delay = i * 30;
        const randomX = (Math.random() - 0.5) * 300;
        const randomRotation = Math.random() * 720 - 360;
        
        translateY.value = withDelay(
          delay,
          withSequence(
            withSpring(-200, { 
              damping: 12,
              stiffness: 100,
            }),
            withSpring(1000, { 
              damping: 15,
              stiffness: 50,
            })
          )
        );

        translateX.value = withDelay(
          delay,
          withSequence(
            withSpring(randomX * 0.5, { damping: 12 }),
            withSpring(randomX, { damping: 10 })
          )
        );

        rotate.value = withDelay(
          delay,
          withSpring(randomRotation, { damping: 10 })
        );

        scale.value = withDelay(
          delay,
          withSequence(
            withSpring(1.2, { damping: 15 }),
            withSpring(0, { damping: 10 })
          )
        );
      }
    }, [visible, isConfirming]);

    return useAnimatedStyle(() => ({
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotate.value}deg` },
        { scale: scale.value },
      ],
      opacity: scale.value,
      position: 'absolute',
      pointerEvents: 'none',
    }));
  });

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.modalOverlay}>
        <View style={styles.confettiContainer}>
          {!isConfirming && confettiPieces.map((style, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                style,
                { backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length] }
              ]}
            />
          ))}
        </View>
        <Animated.View style={[styles.modalContent, containerStyle]}>
          {error ? (
            <View style={styles.errorContent}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.button} onPress={handleClose}>
                <Text style={styles.buttonText}>Close</Text>
              </Pressable>
            </View>
          ) : isConfirming ? (
            <>
              <Text style={styles.confirmTitle}>Confirm Redemption</Text>
              <Text style={styles.amountText}>£{amountToRedeem.toFixed(2)}</Text>
              <Text style={styles.confirmMessage}>
                Are you ready to redeem your savings?
              </Text>
              <View style={styles.buttonContainer}>
                <Pressable 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={handleClose}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.button, styles.confirmButton]} 
                  onPress={handleConfirm}
                >
                  <Text style={styles.buttonText}>Redeem</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.successContent}>
              <View style={styles.trophyContainer}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?q=80&w=200&auto=format&fit=crop' }}
                  style={styles.trophyImage}
                />
              </View>
              <Text style={styles.congratsText}>Congratulations! 🎉</Text>
              <Text style={styles.amountText}>£{amountToRedeem.toFixed(2)}</Text>
              <Text style={styles.messageText}>
                Show this to your parent and make sure they give you the money right now! 🏆
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 320,
    maxWidth: '90%',
    zIndex: 1,
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  confirmTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    minWidth: 130,
  },
  cancelButton: {
    backgroundColor: '#FF9800',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  congratsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  amountText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 16,
  },
  messageText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  trophyContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#F8F8F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  trophyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  confetti: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorContent: {
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
});
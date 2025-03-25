import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  withSequence,
} from 'react-native-reanimated';

const AnimatedImage = Animated.Image;
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface SuccessDialogProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  amount: number;
}

export default function SuccessDialog({ visible, onClose, name, amount }: SuccessDialogProps) {
  const rotation = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withRepeat(
          withTiming('360deg', {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          false
        ),
      },
    ],
  }));

  const buttonScale = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSequence(
          withSpring(1),
          withSpring(1.02, {
            damping: 4,
            stiffness: 200,
          }),
          withSpring(1)
        ),
      },
    ],
  }));

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
          
          <Text style={styles.title}>Great job, {name}!</Text>
          <Text style={styles.subtitle}>You've earned {amount} pence!</Text>

          <View style={styles.imageContainer}>
            <AnimatedImage
              source={{ uri: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?q=80&w=200&auto=format&fit=crop' }}
              style={[styles.image, rotation]}
            />
          </View>

          <Animated.View style={[styles.buttonContainer, buttonScale]}>
            <Pressable onPress={onClose}>
              <AnimatedLinearGradient
                colors={['#FF9800', '#F57C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Awesome!</Text>
              </AnimatedLinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#FFF7E6',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFE4B5',
    padding: 4,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  buttonContainer: {
    overflow: 'hidden',
    borderRadius: 28,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
});
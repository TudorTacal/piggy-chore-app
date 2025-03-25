import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Image, 
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/auth';
import { Mail, Lock, ArrowRight, CircleUser as UserCircle2 } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MIN_PASSWORD_LENGTH = 6;

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { signIn, signUp, setUserInfo, isLoading, error } = useAuth();

  const buttonScale = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(email.length > 0 && password.length >= MIN_PASSWORD_LENGTH ? 1 : 0.98) }
    ],
    opacity: withSpring(email.length > 0 && password.length >= MIN_PASSWORD_LENGTH ? 1 : 0.8),
  }));

  const validateForm = () => {
    setValidationError(null);

    if (!email.trim()) {
      setValidationError('Email is required');
      return false;
    }

    if (!password.trim()) {
      setValidationError('Password is required');
      return false;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return false;
    }

    if (isSignUp && !name.trim()) {
      setValidationError('Name is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (isSignUp) {
        await signUp(email, password);
        await setUserInfo({ name, gender: 'boy' }); // Default to 'boy' for now
      } else {
        await signIn(email, password);
      }
      router.replace('/(tabs)');
    } catch (err) {
      // Error is handled by the context
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setName('');
    setEmail('');
    setPassword('');
    setValidationError(null);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            entering={FadeIn.duration(600)}
            style={styles.content}
          >
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1592542159366-189d098cd073?q=80&w=300&auto=format&fit=crop' }}
                style={styles.logo}
              />
              <Text style={styles.title}>Welcome to Piggy Chore!</Text>
              <Text style={styles.subtitle}>
                {isSignUp ? "Let's create your account!" : "Welcome back!"}
              </Text>
            </View>

            <Animated.View 
              entering={FadeInDown.duration(600).delay(300)}
              style={styles.form}
            >
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <UserCircle2 size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Mail size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    value={email}
                    onChangeText={setEmail}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={`Password (min ${MIN_PASSWORD_LENGTH} characters)`}
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor="#999"
                    secureTextEntry
                    autoComplete="current-password"
                />
              </View>

              {(validationError || error) && (
                <Text style={styles.errorText}>{validationError || error}</Text>
              )}

              <AnimatedPressable
                style={[styles.submitButton, buttonScale]}
                onPress={handleSubmit}
                disabled={isLoading || !email || password.length < MIN_PASSWORD_LENGTH || (isSignUp && !name)}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                    <ArrowRight size={20} color="white" />
                  </>
                )}
              </AnimatedPressable>

              <Pressable 
                style={styles.toggleButton} 
                onPress={toggleMode}
              >
                <Text style={styles.toggleButtonText}>
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F3E8',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 24,
    backgroundColor: '#FF9800',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});
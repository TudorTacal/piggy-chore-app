import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Settings } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function ProfileScreen() {
  const { userInfo, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      // Let the auth context handle navigation through its effect
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#2E7D32']}
        style={styles.header}
      >
        <Animated.View 
          entering={FadeIn.duration(500)}
          style={styles.profileContent}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1592542159366-189d098cd073?q=80&w=300&auto=format&fit=crop' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{userInfo?.name}</Text>
          <Text style={styles.balance}>{formatCurrency(userInfo?.balance || 0)}</Text>
        </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        <Pressable 
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Settings size={24} color="#666" />
          <Text style={styles.menuText}>Settings</Text>
        </Pressable>

        <Pressable 
          style={[styles.menuItem, styles.logoutButton]} 
          onPress={handleLogout}
        >
          <LogOut size={24} color="#D32F2F" />
          <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 32,
    paddingTop: 64,
    alignItems: 'center',
  },
  profileContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 'auto',
    backgroundColor: '#FFEBEE',
  },
  logoutText: {
    color: '#D32F2F',
  },
});
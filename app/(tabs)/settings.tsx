import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { useStore } from '@/store';

export default function SettingsScreen() {
  const { currency, setCurrency } = useStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Currency</Text>
        <View style={styles.option}>
          <Text style={styles.optionText}>Use USD instead of GBP</Text>
          <Switch
            value={currency === 'USD'}
            onValueChange={(value) => setCurrency(value ? 'USD' : 'GBP')}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Savings Goals</Text>
        <Pressable style={styles.goalCard}>
          <View>
            <Text style={styles.goalTitle}>New Toy</Text>
            <Text style={styles.goalProgress}>Saved: £15 / £30</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
        </Pressable>

        <Pressable style={styles.goalCard}>
          <View>
            <Text style={styles.goalTitle}>Theme Park Trip</Text>
            <Text style={styles.goalProgress}>Saved: £45 / £100</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '45%' }]} />
          </View>
        </Pressable>

        <Pressable style={styles.addGoalButton}>
          <Text style={styles.addGoalText}>Add New Goal</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  goalCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  goalProgress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  addGoalButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addGoalText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
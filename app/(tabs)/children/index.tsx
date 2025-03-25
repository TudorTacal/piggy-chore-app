import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, CircleAlert as AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getChildren } from '@/lib/api/children';
import type { Child } from '@/types/database';
import EditChildModal from '@/components/EditChildModal';
import DeleteChildDialog from '@/components/DeleteChildDialog';

interface ChildWithBalance extends Child {
  child_balances: { amount: number }[];
}

export default function ChildrenScreen() {
  const [children, setChildren] = useState<ChildWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildWithBalance | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadChildren = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getChildren();
      setChildren(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChildren();
    }, [])
  );

  const handleEditPress = (child: ChildWithBalance) => {
    setSelectedChild(child);
    setShowEditModal(true);
  };

  const handleDeletePress = (child: ChildWithBalance) => {
    setSelectedChild(child);
    setShowDeleteDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#2E7D32']}
        style={styles.header}
      >
        <Text style={styles.title}>My Children</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/children/add')}
        >
          <Plus color="white" size={24} />
        </Pressable>
      </LinearGradient>

      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle color="#D32F2F" size={48} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadChildren}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : children.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=300&auto=format&fit=crop' }}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyTitle}>No Children Yet</Text>
          <Text style={styles.emptyText}>
            Start by adding your first child to manage their chores and rewards.
          </Text>
          <Pressable
            style={styles.addFirstButton}
            onPress={() => router.push('/children/add')}
          >
            <Text style={styles.addFirstButtonText}>Add Your First Child</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.childrenList}
        >
          {children.map((child) => (
            <View key={child.id} style={styles.childCard}>
              <View style={styles.childInfo}>
                <Image
                  source={{
                    uri: child.avatar_url ||
                      'https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=300&auto=format&fit=crop'
                  }}
                  style={styles.avatar}
                />
                <View style={styles.textInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.balance}>
                    {formatCurrency(child.child_balances[0]?.amount || 0)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.actions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleEditPress(child)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeletePress(child)}
                >
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {selectedChild && (
        <>
          <EditChildModal
            visible={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedChild(null);
            }}
            onSuccess={loadChildren}
            child={selectedChild}
          />
          <DeleteChildDialog
            visible={showDeleteDialog}
            onClose={() => {
              setShowDeleteDialog(false);
              setSelectedChild(null);
            }}
            onSuccess={loadChildren}
            child={selectedChild}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  childrenList: {
    padding: 16,
    gap: 16,
  },
  childCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
  },
  textInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  balance: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    color: '#D32F2F',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 24,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
  },
  addFirstButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
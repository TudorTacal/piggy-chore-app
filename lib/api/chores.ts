import { supabase } from '../supabase';
import type { Chore } from '@/types/database';

export async function getChores(childId: string, routineType?: 'morning' | 'evening') {
  const query = supabase
    .from('chores')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: true });

  if (routineType) {
    query.eq('routine_type', routineType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function createChore(
  childId: string,
  data: {
    title: string;
    description?: string;
    reward_amount: number;
    routine_type: 'morning' | 'evening';
    is_custom?: boolean;
  }
) {
  const { data: chore, error } = await supabase
    .from('chores')
    .insert({
      child_id: childId,
      title: data.title,
      description: data.description,
      reward_amount: data.reward_amount,
      routine_type: data.routine_type,
      is_custom: data.is_custom ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return chore;
}

export async function updateChore(
  id: string,
  data: {
    title?: string;
    description?: string;
    reward_amount?: number;
    routine_type?: 'morning' | 'evening';
  }
) {
  const { data: chore, error } = await supabase
    .from('chores')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return chore;
}

export async function deleteChore(id: string) {
  const { error } = await supabase
    .from('chores')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function toggleChore(choreId: string, completed: boolean): Promise<ToggleChoreResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  try {
    const { data, error } = await supabase.rpc('toggle_chore', {
      p_chore_id: choreId,
      p_user_id: user.id,
      p_completed: completed
    });

    if (error) {
      console.error('Error toggling chore:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from toggle_chore');
    }

    console.log('Toggle chore response:', data);
    return data as ToggleChoreResponse;
  } catch (error) {
    console.error('Error in toggleChore:', error);
    throw error;
  }
}

export async function resetChores(childId: string, routineType: 'morning' | 'evening'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  try {
    const { error } = await supabase.rpc('reset_chores', {
      p_child_id: childId,
      p_routine_type: routineType,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error resetting chores:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in resetChores:', error);
    throw error;
  }
}

interface ToggleChoreResponse {
  chore: Chore;
  balance: number;
  previousBalance: number;
  rewardAmount: number;
  completed: boolean;
}
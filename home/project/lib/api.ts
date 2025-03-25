import { supabase } from './supabase';
import type { Child, Chore, ChildBalance } from '@/types/database';

export async function createChild(name: string, avatarUrl?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // First create the child
  const { data: child, error: childError } = await supabase
    .from('children')
    .insert({
      name,
      avatar_url: avatarUrl,
    })
    .select()
    .single();

  if (childError) throw childError;

  // Then create the relationship
  const { error: relError } = await supabase
    .from('parent_child_relationships')
    .insert({
      parent_id: user.id,
      child_id: child.id,
      relationship_type: 'parent',
    });

  if (relError) throw relError;

  // Finally create the initial balance
  const { error: balError } = await supabase
    .from('child_balances')
    .insert({
      child_id: child.id,
      amount: 0,
    });

  if (balError) throw balError;

  return child;
}

export async function getChildren() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get children through the relationships table
  const { data, error } = await supabase
    .from('parent_child_relationships')
    .select(`
      child:children (
        id,
        name,
        avatar_url,
        created_at,
        updated_at,
        child_balances (
          amount
        ),
        chores (
          *
        )
      )
    `)
    .eq('parent_id', user.id)
    .eq('relationship_type', 'parent');

  if (error) throw error;

  // Transform the data to match the expected format
  return data?.map(rel => rel.child) ?? [];
}

export async function createChore(
  childId: string,
  title: string,
  rewardAmount: number,
  description?: string,
) {
  const { data, error } = await supabase
    .from('chores')
    .insert({
      child_id: childId,
      title,
      description,
      reward_amount: rewardAmount,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChoreStatus(
  choreId: string,
  status: Chore['status'],
) {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', choreId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addChildBalance(
  childId: string,
  amount: number,
) {
  const { error } = await supabase
    .rpc('add_child_balance', {
      p_child_id: childId,
      p_amount: amount,
    });

  if (error) throw error;
}

export async function linkParent(
  childId: string,
  parentEmail: string,
) {
  const { data: { users }, error: userError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', parentEmail)
    .limit(1);

  if (userError) throw userError;
  if (!users?.length) throw new Error('Parent not found');

  const { error } = await supabase
    .from('parent_child_relationships')
    .insert({
      parent_id: users[0].id,
      child_id: childId,
      relationship_type: 'parent',
    });

  if (error) throw error;
}
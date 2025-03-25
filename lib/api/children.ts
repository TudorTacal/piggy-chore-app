import { supabase } from '../supabase';
import type { Child } from '@/types/database';

export async function createChild(name: string, avatarUrl?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc(
    'create_child_with_relationships',
    {
      p_name: name,
      p_parent_id: user.id,
      p_avatar_url: avatarUrl
    }
  );

  if (error) throw error;
  return data;
}

export async function updateChild(id: string, data: { name?: string; avatar_url?: string }) {
  const { data: updatedChild, error } = await supabase
    .from('children')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updatedChild;
}

export async function deleteChild(id: string) {
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id);

  if (error) throw error;
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

export async function linkParent(childId: string, parentEmail: string) {
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
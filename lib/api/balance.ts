import { supabase } from '../supabase';

export async function resetBalance(childId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  try {
    const { data, error } = await supabase.rpc('reset_child_balance', {
      p_child_id: childId,
      p_user_id: user.id
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error resetting balance:', error);
    throw error;
  }
}
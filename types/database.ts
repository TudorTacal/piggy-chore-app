export interface Child {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  child_balances?: ChildBalance[];
  chores?: Chore[];
}

export interface ParentChildRelationship {
  id: string;
  parent_id: string;
  child_id: string;
  relationship_type: 'parent' | 'guardian';
  created_at: string;
}

export interface ChildBalance {
  id: string;
  child_id: string;
  amount: number;
  updated_at: string;
}

export interface Chore {
  id: string;
  child_id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  routine_type: 'morning' | 'evening';
  is_custom: boolean;
  completion_status: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChoreCompletion {
  id: string;
  chore_id: string;
  child_id: string;
  completed_by: string;
  completed_at: string;
  reward_amount: number;
  created_at: string;
}
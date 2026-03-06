import { User } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

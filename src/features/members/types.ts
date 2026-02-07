import type { UserRole } from '@/types/database';

export interface MemberListItem {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  organic_id: number | null;
  role: UserRole | null;
  total_points: number;
  tasks_completed: number;
  profile_visible: boolean;
  created_at: string | null;
}

export interface MemberProfile extends MemberListItem {
  bio: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  wallet_pubkey: string | null;
}

export interface MemberFilters {
  search: string;
  role: UserRole | 'all';
  page: number;
  limit: number;
}

export interface MembersResponse {
  members: MemberListItem[];
  total: number;
  page: number;
  limit: number;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  council: 'Council',
  member: 'Member',
  guest: 'Guest',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  council: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  member: 'bg-green-500/10 text-green-400 border-green-500/20',
  guest: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export interface User {
  username: string;
  email: string;
}

export interface Entry {
  id: number;
  date: string;
  mood: number;
  note: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total_entries: number;
  current_streak: number;
  longest_streak: number;
  avg_mood_30d: number | null;
  mood_counts: Record<string, number>;
  entries_this_week: number;
  entries_this_month: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

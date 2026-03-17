export interface Event {
  id: string;
  name: string;
  access_type: "code" | "geo";
  access_value: string | { lat: number; lng: number; radius_meters: number };
  prompt_interval_minutes: number;
  auto_cycle: boolean;
  created_at: string;
  active_prompt?: Prompt | null;
}

export interface Prompt {
  id: string;
  event_id: string;
  text: string;
  fired_at: string | null;
  duration_seconds: number;
  active: boolean;
  created_at?: string;
}

export interface Submission {
  id: string;
  prompt_id: string;
  user_session_id: string;
  image_url: string;
  validated: boolean;
  confidence?: number;
  submitted_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  session_id: string;
  display_name: string | null;
  joined_at: string;
  submission_count?: number;
}

export interface LeaderboardEntry {
  session_id: string;
  username: string;
  score: number;
  validated: number;
  total: number;
}

export interface Event {
  id: string;
  name: string;
  access_type: "code" | "geo";
  access_value: string | { lat: number; lng: number; radius_meters: number };
  active_prompt?: Prompt | null;
}

export interface Prompt {
  id: string;
  event_id: string;
  text: string;
  fired_at: string | null;
  duration_seconds: number;
  active: boolean;
}

export interface Submission {
  id: string;
  prompt_id: string;
  user_session_id: string;
  image_url: string;
  validated: boolean;
  submitted_at: string;
}

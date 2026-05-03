export type TopicSet = {
  id: string;
  user_id: string;
  topics: string[];
  prompt_hint: string;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  topic_set_id: string | null;
  topic: string;
  content: string;
  word_count: number;
  is_favorite: boolean;
  created_at: string;
};

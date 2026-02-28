export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  step_number: number;
  created_at: string;
}

export interface Folder {
  id: string;
  project_id: string;
  parent_id?: string;
  name: string;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  title: string;
  content: string;
  extracted_text?: string;
  type: string;
  step_number?: number;
  folder_id?: string;
  created_at: string;
}

export interface Review {
  id: string;
  project_id: string;
  content: string;
  status?: 'todo' | 'doing' | 'done';
  remark?: string;
  created_at: string;
  step_number: number;
}

export interface AIModel {
  id: string;
  display_name: string;
  model_name: string;
  base_url: string;
  api_key: string;
  is_active: number;
  created_at: string;
}

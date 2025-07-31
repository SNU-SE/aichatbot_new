
export interface Activity {
  id: string;
  title: string;
  type: string;
  content: any;
  file_url: string | null;
  final_question: string | null;
  modules_count: number | null;
  created_at: string;
  is_hidden?: boolean;
}

export interface Module {
  id?: string;
  module_number: number;
  title: string;
  steps: ChecklistItem[];
}

export interface ChecklistItem {
  id?: string;
  step_number: number;
  description: string;
  module_id?: string;
}

export interface ActivityFormData {
  title: string;
  type: string;
  final_question: string;
  modules_count: number;
  file_url: string;
}

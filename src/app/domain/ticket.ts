/** OpsBoard domain model. */
export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'new' | 'progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
}

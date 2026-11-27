export type TicketStatus = 'new' | 'progress' | 'done';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee?: string;
}

/** The on-call team – the people a ticket can be assigned to. */
export const TEAM = ['Marta Kowalska', 'Tomasz Nowak', 'Anna Wiśniewska', 'Piotr Zieliński'];

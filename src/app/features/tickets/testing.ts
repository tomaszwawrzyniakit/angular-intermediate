import { Ticket } from './ticket';

/** Small, predictable test data: 7 tickets → 2 pages. */
export const TEST_TICKETS: Ticket[] = [1, 2, 3, 4, 5, 6, 7].map((id) => ({
  id,
  title: `Ticket ${id}`,
  description: 'Something is broken',
  status: id <= 3 ? 'done' : 'new',
  priority: 'medium',
}));

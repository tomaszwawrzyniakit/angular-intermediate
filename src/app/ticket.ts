export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'new' | 'progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
}

// A status filter value: one of the real statuses, or "all" to skip filtering.
export type TicketStatusFilter = 'all' | Ticket['status'];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 1,
    title: 'Production database connection pool exhausted',
    description:
      'The order service is failing with pool-timeout errors during the morning peak. Connections are not being released after slow queries.',
    status: 'progress',
    priority: 'high',
    assignee: 'Anita Kowalska',
  },
  {
    id: 2,
    title: 'Payment webhook retries flooding the queue',
    description:
      'Duplicate payment confirmation webhooks are being enqueued. The consumer is processing the same event multiple times, causing duplicate ledger entries.',
    status: 'new',
    priority: 'high',
    assignee: 'Marek Nowak',
  },
  {
    id: 3,
    title: 'Elevated 502 errors on the public API gateway',
    description:
      'Around 3% of requests to the checkout endpoint return 502. Upstream pods appear to be restarting under load, suggesting an OOM issue.',
    status: 'progress',
    priority: 'high',
    assignee: 'Piotr Wiśniewski',
  },
  {
    id: 4,
    title: 'Nightly backup job failed for the analytics warehouse',
    description:
      'The scheduled backup did not complete and no snapshot was published. Data is 24 hours behind and the restore test is now invalid.',
    status: 'new',
    priority: 'medium',
    assignee: 'Anita Kowalska',
  },
  {
    id: 5,
    title: 'Customer self-service portal returns 401 after login',
    description:
      'A subset of users see intermittent authentication failures right after signing in. Session tokens appear to be rejected by the authz service.',
    status: 'progress',
    priority: 'medium',
  },
  {
    id: 6,
    title: 'Email delivery service latency above SLA',
    description:
      'Transactional email delivery latency crossed the 30-second SLA threshold twice this week. The SMTP provider reports throttling.',
    status: 'done',
    priority: 'medium',
    assignee: 'Marek Nowak',
  },
  {
    id: 7,
    title: 'Log ingestion pipeline dropping high-severity events',
    description:
      'Error-level log events are intermittently missing from the dashboard. The ingestion pipeline shows backpressure and silent drops under spikes.',
    status: 'new',
    priority: 'low',
  },
  {
    id: 8,
    title: 'Mobile app crash spike on cold start',
    description:
      'Crash rate on the Android app tripled after the last release. Stack traces point to a native library mismatch on older devices.',
    status: 'done',
    priority: 'high',
    assignee: 'Kasia Zielińska',
  },
  {
    id: 9,
    title: 'Search index lagging behind the primary by 40 minutes',
    description:
      'The read-replica search cluster is out of sync after the replication backlog. Recent records are not appearing in search results.',
    status: 'progress',
    priority: 'low',
    assignee: 'Piotr Wiśniewski',
  },
  {
    id: 10,
    title: 'Rate limiter misconfigured for the internal tools API',
    description:
      'The default rate limit was too aggressive and blocked legitimate internal automation. Requests now need a per-client quota adjustment.',
    status: 'done',
    priority: 'low',
  },
];

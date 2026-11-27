import { Router, json } from 'express';

import { Ticket } from '../app/features/tickets/ticket';

/**
 * A tiny in-memory REST API for the training (lives in the SSR Express server).
 * Real HTTP: every call is visible in DevTools → Network, including cancelled ones.
 * Data resets when the server restarts.
 */
const tickets: Ticket[] = [
  {
    id: 1,
    title: 'Payment gateway timeouts in production',
    description:
      'Checkout requests to the payment provider time out under load. ~4% of orders fail and customers retry.',
    status: 'progress',
    priority: 'high',
    assignee: 'Marta Kowalska',
  },
  {
    id: 2,
    title: 'Disk usage above 90% on logging cluster',
    description:
      'The log-forwarding nodes are filling up. Old indices are not rotated, so storage grows until ingestion stops.',
    status: 'new',
    priority: 'high',
  },
  {
    id: 3,
    title: 'New SSO login flow for partner portal',
    description:
      'Partners should be able to sign in through the corporate identity provider using OIDC. Needs a review before rollout.',
    status: 'new',
    priority: 'medium',
  },
  {
    id: 4,
    title: 'Slow dashboard queries on the analytics DB',
    description:
      'The top-10 dashboard widgets take 8-12s. Suspect a missing index on the events table after the schema change.',
    status: 'progress',
    priority: 'medium',
    assignee: 'Tomasz Nowak',
  },
  {
    id: 5,
    title: 'Patch OS image and redeploy build agents',
    description:
      'Security patching window: update the build agent image and roll it out over the weekend to avoid impact.',
    status: 'progress',
    priority: 'low',
    assignee: 'Anna Wiśniewska',
  },
  {
    id: 6,
    title: 'Customer report: invoice PDF shows wrong currency',
    description:
      'Some invoices rendered in USD instead of EUR. Likely a locale setting that is lost after session refresh.',
    status: 'done',
    priority: 'medium',
    assignee: 'Piotr Zieliński',
  },
  {
    id: 7,
    title: 'Rotate expired API credentials for the CI pipeline',
    description:
      'The pipeline service account token expired. Rotate credentials and store them in the vault, not in env files.',
    status: 'done',
    priority: 'low',
  },
  {
    id: 8,
    title: 'Enable 2FA for all on-call engineers',
    description:
      'Compliance requires MFA on the incident bridge and the on-call rotation tool. Enforce it by end of month.',
    status: 'progress',
    priority: 'medium',
    assignee: 'Marta Kowalska',
  },
  {
    id: 9,
    title: 'Flaky integration test blocks nightly builds',
    description:
      'The payment webhook test intermittently fails with a race condition. Nightly builds are red twice this week.',
    status: 'new',
    priority: 'high',
  },
  {
    id: 10,
    title: 'Upgrade staging cluster to Kubernetes 1.31',
    description:
      'Planned maintenance: upgrade staging control plane and node pools, then verify the deployment pipeline end to end.',
    status: 'done',
    priority: 'low',
    assignee: 'Tomasz Nowak',
  },
];

/** Simulated network latency, long enough to watch loading states and request cancellation. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const ticketApi = Router();
ticketApi.use(json());

// GET /api/tickets?q=pay   (q=boom simulates a server error, for the error-handling demo)
ticketApi.get('/tickets', async (req, res) => {
  const q = String(req.query['q'] ?? '')
    .trim()
    .toLowerCase();
  await delay(q ? 600 : 300);
  if (q === 'boom') {
    res.status(500).json({ message: 'Search index is down' });
    return;
  }
  res.json(tickets.filter((t) => t.title.toLowerCase().includes(q)));
});

ticketApi.get('/tickets/:id', async (req, res) => {
  await delay(300);
  const ticket = tickets.find((t) => t.id === Number(req.params.id));
  if (ticket) {
    res.json(ticket);
  } else {
    res.status(404).json({ message: `Ticket ${req.params.id} not found` });
  }
});

// PATCH /api/tickets/3  { "status": "done" } or { "assignee": "Anna Wiśniewska" }
ticketApi.patch('/tickets/:id', async (req, res) => {
  await delay(300);
  const ticket = tickets.find((t) => t.id === Number(req.params.id));
  if (!ticket) {
    res.status(404).json({ message: `Ticket ${req.params.id} not found` });
    return;
  }
  const { status, assignee } = req.body as Partial<Ticket>;
  Object.assign(ticket, status ? { status } : {}, assignee !== undefined ? { assignee } : {});
  res.json(ticket);
});

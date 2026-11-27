import {
  applyEach,
  email,
  hidden,
  maxLength,
  min,
  minLength,
  required,
  schema,
  validate,
  validateHttp,
} from '@angular/forms/signals';

import { TicketPriority } from '../ticket';
import { phoneNumber } from './validators';

/** The form model: one nested object per wizard step. */
export interface TicketDraft {
  basics: {
    title: string;
    description: string;
    priority: TicketPriority;
  };
  reporter: {
    name: string;
    email: string;
    phone: string;
    preferredChannel: 'email' | 'phone';
  };
  impact: {
    serviceDown: boolean;
    affectedUsers: number;
    services: string[]; // dynamic list: the user adds/removes rows
    workaroundAvailable: boolean;
    workaround: string;
  };
}

export const EMPTY_DRAFT: TicketDraft = {
  basics: { title: '', description: '', priority: 'medium' },
  reporter: { name: '', email: '', phone: '', preferredChannel: 'email' },
  impact: {
    serviceDown: false,
    affectedUsers: 0,
    services: [''],
    workaroundAvailable: false,
    workaround: '',
  },
};

/** All validation rules in one place – the component only renders. */
export const ticketDraftSchema = schema<TicketDraft>((t) => {
  // 1) Built-in validators
  required(t.basics.title, { message: 'Title is required.' });
  minLength(t.basics.title, 5, { message: 'At least 5 characters.' });
  maxLength(t.basics.title, 100, { message: 'At most 100 characters.' });
  required(t.basics.description, { message: 'Describe the problem.' });
  minLength(t.basics.description, 20, { message: 'At least 20 characters.' });

  // 2) Conditional rule: the same validator, active only `when` the condition holds
  minLength(t.basics.description, 50, {
    message: 'High priority needs at least 50 characters.',
    when: ({ valueOf }) => valueOf(t.basics.priority) === 'high',
  });

  // 3) Async rule against the server (runs only when the sync rules pass).
  //    validateHttp builds an httpResource for us: debounce + cancellation included.
  validateHttp(t.basics.title, {
    request: ({ value }) => `/api/tickets/title-check?title=${encodeURIComponent(value())}`,
    debounce: 400,
    onSuccess: (res: { duplicateOf: { id: number } | null }) =>
      res.duplicateOf
        ? { kind: 'duplicate', message: `Same title as ticket #${res.duplicateOf.id}.` }
        : undefined,
    onError: () => undefined, // the check is a hint – do not block the user if it fails
  });

  // 4) Cross-field rule: phone is required only when it is the preferred channel
  required(t.reporter.name, { message: 'Who reports it?' });
  required(t.reporter.email, { message: 'Email is required.' });
  email(t.reporter.email, { message: 'Not a valid email.' });
  required(t.reporter.phone, {
    message: 'Phone is required for phone contact.',
    when: ({ valueOf }) => valueOf(t.reporter.preferredChannel) === 'phone',
  });
  phoneNumber(t.reporter.phone); // 5) our own reusable validator (validators.ts)

  // 6) Dynamic list: applyEach() applies the rules to every item, also to rows added later
  min(t.impact.affectedUsers, 0, { message: 'Cannot be negative.' });
  applyEach(t.impact.services, (service) =>
    required(service, { message: 'Name the service or remove the row.' }),
  );

  // 7) Business rule spanning two steps: an outage for >100 users must be high priority
  validate(t.impact.affectedUsers, ({ value, valueOf }) =>
    valueOf(t.impact.serviceDown) && value() > 100 && valueOf(t.basics.priority) !== 'high'
      ? {
          kind: 'priority',
          message: 'An outage for more than 100 users must be high priority (step 1).',
        }
      : undefined,
  );

  // 8) Conditional section: hidden fields are skipped by validation
  hidden(t.impact.workaround, { when: ({ valueOf }) => !valueOf(t.impact.workaroundAvailable) });
  required(t.impact.workaround, { message: 'Describe the workaround.' });
  minLength(t.impact.workaround, 20, { message: 'At least 20 characters.' });
});

// Complex forms: a sub-schema can be reused for every object of the same shape, e.g.
//   const contactSchema = schema<Contact>((c) => { required(c.name); email(c.email); });
//   apply(t.reporter, contactSchema);
//   applyWhen(t.reporter, ({ valueOf }) => valueOf(t.impact.serviceDown), contactSchema);

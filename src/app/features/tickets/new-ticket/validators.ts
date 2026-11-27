import { SchemaPath, validate } from '@angular/forms/signals';

const PHONE = /^\+?[0-9 ]{9,15}$/;

/**
 * A reusable custom validator: a function that adds rules to a path.
 * Use it in any schema like a built-in one: `phoneNumber(p.phone)`.
 * Empty values pass – combine with required() when the field is mandatory.
 */
export function phoneNumber(
  path: SchemaPath<string>,
  message = 'Use digits only, e.g. +48 600 700 800.',
) {
  validate(path, ({ value }) =>
    value() && !PHONE.test(value()) ? { kind: 'phoneNumber', message } : undefined,
  );
}

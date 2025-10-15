
'use client';

import { AppPermissions, PermissionChange } from './types';
import { ALL_PERMISSIONS } from './permissions';

/**
 * Compares two permission maps and returns an array of changes.
 * @param before The state of permissions before the change.
 * @param after The state of permissions after the change.
 * @returns An array of PermissionChange objects.
 */
export function diffPermissions(
  before: Partial<AppPermissions>,
  after: Partial<AppPermissions>
): PermissionChange[] {
  const changes: PermissionChange[] = [];

  ALL_PERMISSIONS.forEach((key) => {
    const fromValue = before[key] ?? null;
    const toValue = after[key] ?? null;

    if (fromValue !== toValue) {
      changes.push({
        key,
        from: fromValue,
        to: toValue,
      });
    }
  });

  return changes;
}

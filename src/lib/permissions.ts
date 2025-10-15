
import type { AppPermissions, Organization, User } from './types';
import { Timestamp } from 'firebase/firestore';

export const ALL_PERMISSIONS: (keyof Omit<AppPermissions, 'lastUpdated' | 'inheritedFromOrg'>)[] = [
    'viewIncidents',
    'createIncidents',
    'editIncidents',
    'deleteIncidents',
    'viewReports',
    'viewAIReports',
    'generateAIReports',
    'viewQuotes',
    'manageUsers',
    'manageCategories',
    'manageSettings',
];

export const defaultPermissions: AppPermissions = {
    viewIncidents: true,
    createIncidents: false,
    editIncidents: false,
    deleteIncidents: false,
    viewReports: true,
    viewAIReports: false,
    generateAIReports: false,
    viewQuotes: true,
    manageUsers: false,
    manageCategories: false,
    manageSettings: false,
    lastUpdated: Timestamp.now(),
    inheritedFromOrg: true,
};

/**
 * Resolves the effective permissions for a user by merging organization-level
 * and user-level (override) permissions.
 * @param user The user object, which may have a 'permissions' property.
 * @param org The organization object, which should have a 'permissions' property.
 * @returns The final, effective AppPermissions for the user.
 */
export function getEffectivePermissions(user: User | null | undefined, org: Organization | null | undefined): AppPermissions {
    const orgPermissions = org?.permissions || defaultPermissions;
    const userPermissions = user?.permissions;

    if (userPermissions && userPermissions.inheritedFromOrg === false) {
        // User has an override, so we use their permissions directly.
        // We still spread the default to ensure all keys are present.
        return {
            ...defaultPermissions, 
            ...userPermissions,
            inheritedFromOrg: false,
        };
    }

    // User inherits from the organization.
    return {
        ...defaultPermissions,
        ...orgPermissions,
        inheritedFromOrg: true,
    };
}

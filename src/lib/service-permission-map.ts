
import type { AppPermissions } from './types';

export type Services = {
  instantIncidents?: boolean;
  weeklyReports?: boolean;
  monthlyReports?: boolean;
  aiReports?: boolean;
  other?: boolean;
};

/**
 * Translates a set of requested services from a quote into a default
 * set of permissions for a new organization.
 * @param services An object with boolean flags for each service.
 * @returns An AppPermissions object.
 */
export function mapServicesToPermissions(services: Services): Partial<AppPermissions> {
  const basePermissions: Partial<AppPermissions> = {
    // Default permissions for any new organization
    viewIncidents: true,
    viewQuotes: true,
    manageUsers: false,
    manageCategories: false,
    manageSettings: false,

    // Permissions derived from services
    createIncidents: !!services.instantIncidents,
    editIncidents: !!services.instantIncidents,
    deleteIncidents: false, // Explicitly false by default for safety
    
    viewReports: !!(services.weeklyReports || services.monthlyReports || services.aiReports),
    viewAIReports: !!services.aiReports,
    generateAIReports: false, // Explicitly false by default, requires separate grant
  };

  return basePermissions;
}

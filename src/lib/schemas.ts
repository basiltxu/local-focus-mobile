
import { z } from 'zod';
import { incidentFormSchema, incidentSchema } from './schemas/incident';

// This file is now a barrel file for schema modules.

// Schema for the quote request form
export const quoteSchema = z.object({
  orgName: z.string().min(2, 'Organization name is required.'),
  contactPerson: z.string().min(2, 'Contact person name is required.'),
  contactEmail: z.string().email('A valid email address is required.'),
  contactPhone: z.string().optional(),
  services: z.object({
    instantIncidents: z.boolean().optional(),
    weeklyReports: z.boolean().optional(),
    monthlyReports: z.boolean().optional(),
    aiReports: z.boolean().optional(),
    other: z.boolean().optional(),
  }).optional(),
  customMessage: z.string().min(10, 'Message must be at least 10 characters long.'),
});


// Schema for the user creation/edit form
export const userFormSchema = z.object({
  uid: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().optional(),
  role: z.enum(['SuperAdmin', 'Admin', 'Editor', 'User']),
  organizationId: z.string().optional(),
});

// Schema for saving a report
export const reportSchema = z.object({
  type: z.enum(['weekly', 'monthly']),
  isAiGenerated: z.boolean(),
  data: z.any().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  periodDate: z.date().optional(),
  visibility: z.enum(['private', 'public']).optional(),
  organizationId: z.string().optional(),
  generatedBy: z.string(),
});

// Re-export incident schemas for convenience
export { incidentFormSchema, incidentSchema };

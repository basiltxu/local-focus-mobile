
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Base schema for core incident fields that are editable by users
export const incidentFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(200, "Title cannot exceed 200 characters."),
  description: z.string().min(2, "Description is required."),
  categoryId: z.string().nonempty("Please select a category."),
  subCategoryId: z.string().optional(),
  countryId: z.string().nonempty("Please select a country."),
  regionOrDistrictId: z.string().optional(),
  governorateId: z.string().optional(),
  cityId: z.string().nonempty("Please select a city/area."),
  impactStatus: z.enum(["low", "medium", "high"]),
  editorialNotes: z.string().optional(),
  media: z.any().optional(), // For file upload handling on the client
});

// Full authoritative schema for the 'incidents' collection, including all audit and server-managed fields.
export const incidentSchema = z.object({
  // Editable fields from the form
  title: z.string().min(2).max(200),
  description: z.string().min(2),
  categoryId: z.string(),
  subCategoryId: z.string().optional(),
  impactStatus: z.enum(["low", "medium", "high"]),
  editorialNotes: z.string().nullable().optional(),
  
  // Location fields
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  location: z.string(),
  locationId: z.string(),
  fullLocationPath: z.string(),

  // Server-managed fields
  id: z.string(),
  imageId: z.string(),
  organizationId: z.literal("LOCAL_FOCUS_ORG_ID"),
  createdBy: z.string(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
  updatedBy: z.string(),

  visibility: z.enum(["private", "public"]),
  status: z.enum(["Draft", "Review", "Approved", "Published", "Live", "Closed"]),
  
  // Audit fields managed by Cloud Function
  approvedAt: z.instanceof(Timestamp).nullable(),
  approvedBy: z.string().nullable(),
  publishedAt: z.instanceof(Timestamp).nullable(),
  publishedBy: z.string().nullable(),

  statusHistory: z.array(z.object({
    changedAt: z.instanceof(Timestamp),
    changedBy: z.string(),
    changedByName: z.string(),
    previousStatus: z.string(),
    newStatus: z.string(),
  })),
});

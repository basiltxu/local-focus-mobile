
'use server';

import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { quoteSchema } from '@/lib/schemas';
import { z } from 'zod';
import { collections } from '@/lib/paths';

// The input data must now include the org ID, as quotes are a subcollection.
interface RequestQuoteData extends z.infer<typeof quoteSchema> {
  organizationId: string;
  organizationName: string;
  createdBy: string;
  createdByName: string;
}

export async function requestQuote(data: RequestQuoteData) {
  const validation = quoteSchema.safeParse(data);

  if (!validation.success) {
    return {
      success: false,
      message: validation.error.errors.map((e) => e.message).join(', '),
    };
  }

  // Ensure an organizationId is provided, as it's required for the path.
  if (!data.organizationId) {
      console.error("Attempted to create a quote without an organization ID.");
      return { success: false, message: "Could not determine the organization for this quote." };
  }

  // Path to the 'quotes' subcollection within the specified organization
  const quotesRef = collection(db, collections.organizations, data.organizationId, collections.quotes);

  const quoteRequestData = {
    ...validation.data,
    organizationId: data.organizationId, // Storing for denormalization and rules
    organizationName: data.organizationName,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    status: 'pending' as const,
    assignedTo: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(quotesRef, quoteRequestData);
    
    return {
      success: true,
      message: 'Your quote request has been submitted successfully. An email confirmation has been sent.',
      quoteId: docRef.id,
    };
  } catch (error: any) {
    console.error("Error requesting quote:", error);
    return {
      success: false,
      message: 'An error occurred while submitting your request. Please try again.',
    };
  }
}
    
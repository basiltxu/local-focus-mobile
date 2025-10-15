
'use server';

import { functions } from '@/lib/firebase';
import { Role } from '@/lib/types';
import { httpsCallable } from 'firebase/functions';

/**
 * Calls a secure Cloud Function to create a user, send an invite, and create the user document.
 * This is the single source of truth for user invitations.
 * @param data The details of the user to invite.
 * @returns An object indicating success or failure.
 */
export async function sendInvite(data: {
  email: string;
  displayName: string;
  organizationId: string;
  role: Role;
}) {
  try {
    const sendOrganizationInvite = httpsCallable(functions, 'sendOrganizationInvite');
    const result = await sendOrganizationInvite(data);
    
    if ((result.data as any).success) {
        return { success: true, message: (result.data as any).message };
    } else {
        throw new Error((result.data as any).message || 'The cloud function reported an error.');
    }

  } catch (error: any) {
    console.error('Error calling sendOrganizationInvite function:', error);
    // It's crucial not to expose detailed internal errors to the client.
    let message = 'An unexpected error occurred while sending the invitation.';
    if (error.code === 'functions/unauthenticated') {
        message = 'You must be logged in to send invitations.';
    } else if (error.code === 'functions/not-found') {
        message = 'The invitation service is currently unavailable. Please try again later.';
    } else if (error.message) {
        message = error.message;
    }
    return { success: false, error: message };
  }
}

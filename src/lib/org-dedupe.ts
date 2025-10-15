
'use client';

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections } from './paths';
import type { Organization } from './types';

/**
 * Normalizes an organization name for consistent searching.
 * @param name The raw organization name.
 * @returns A cleaned, lowercased version of the name.
 */
export function normalizeOrgName(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Extracts the domain from an email address.
 * @param email The email address.
 * @returns The domain part of the email, or null if invalid.
 */
export function deriveEmailDomain(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[1]?.toLowerCase() || null;
}

interface FindOrgParams {
  orgName: string;
  contactEmail: string;
}

/**
 * Searches Firestore for an existing organization that matches either
 * the normalized name or the email domain.
 * @param params Object containing orgName and contactEmail.
 * @returns The found Organization document or null if no match is found.
 */
export async function findExistingOrg({ orgName, contactEmail }: FindOrgParams): Promise<Organization | null> {
  const orgsRef = collection(db, collections.organizations);

  // 1. Check for a match by normalized name
  const normalizedName = normalizeOrgName(orgName);
  const nameQuery = query(orgsRef, where('name_normalized', '==', normalizedName), limit(1));
  const nameSnap = await getDocs(nameQuery);
  if (!nameSnap.empty) {
    return { id: nameSnap.docs[0].id, ...nameSnap.docs[0].data() } as Organization;
  }

  // 2. Check for a match by email domain
  const emailDomain = deriveEmailDomain(contactEmail);
  if (emailDomain) {
    const domainQuery = query(orgsRef, where('emailDomain', '==', emailDomain), limit(1));
    const domainSnap = await getDocs(domainQuery);
    if (!domainSnap.empty) {
      return { id: domainSnap.docs[0].id, ...domainSnap.docs[0].data() } as Organization;
    }
  }

  return null;
}

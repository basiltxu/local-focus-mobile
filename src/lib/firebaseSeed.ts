
'use client';

import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

// This file is deprecated. Seeding logic has been moved to components
// under /src/components/admin/ for better UI feedback and control.
// This file can be safely removed.

export async function seedFromSuperAdmin() {
  console.warn("DEPRECATED: Seeding logic has been moved to components in /src/components/admin/. This function should not be used.");
}

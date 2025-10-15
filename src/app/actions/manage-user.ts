
"use server";

import { z } from 'zod';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppRole, OrgRole, User } from '@/lib/types';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

// This schema defines the data coming from the form
const userFormSchema = z.object({
  uid: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  // The 'role' from the form is a simplified value ('admin', 'editor', 'user')
  role: z.enum(['admin', 'editor', 'user', 'superadmin']),
  organizationId: z.string().optional(),
  expires: z.date().optional(),
  phoneNumber: z.string().regex(phoneRegex, 'Invalid Phone Number!').optional().or(z.literal('')),
});


// This function is not used for direct creation anymore but can be kept for other purposes.
export async function createUserInDb(data: z.infer<typeof userFormSchema>) {
  const validation = userFormSchema.safeParse(data);

  if (!validation.success) {
    return {
        success: false,
        message: validation.error.errors.map(e => e.message).join(', ')
    };
  }
  
  const { uid, ...userData } = validation.data;
  
  let appRole: AppRole = 'user';
  let orgRole: OrgRole = 'member';

  if (userData.role === 'admin') {
      appRole = 'admin';
      orgRole = 'org_admin';
  } else if (userData.role === 'editor') {
      orgRole = 'editor';
  } else if (userData.role === 'superadmin') {
      appRole = 'superadmin';
      // orgRole remains 'member' or could be set to 'org_admin' if superadmins manage a default org
      orgRole = 'org_admin'; 
  }
  
  try {
    await setDoc(doc(db, "users", uid), {
      ...userData,
      appRole: appRole,
      orgRole: orgRole,
      status: 'active', 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      message: `User profile created in database.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Database Error: ${error.message}`,
    };
  }
}


export async function updateUserInDb(data: z.infer<typeof userFormSchema>) {
  const validation = userFormSchema.safeParse(data);

  if (!validation.success) {
    return {
        success: false,
        message: validation.error.errors.map(e => e.message).join(', ')
    };
  }

  const { uid, role, ...userData } = validation.data;
  
  if (!uid) {
    return { success: false, message: 'User ID is missing.' };
  }
  
  const updateData: Partial<User> & { organizationId?: string | null, orgRole?: OrgRole | null } = {
    ...userData,
    updatedAt: serverTimestamp(),
  };

  // Normalize roles and organization
  if (role === 'superadmin') {
    updateData.appRole = 'superadmin';
    updateData.orgRole = null;
    updateData.organizationId = null;
  } else if (role === 'admin') {
    updateData.appRole = 'admin';
    updateData.orgRole = 'org_admin';
    if (!userData.organizationId) {
      return { success: false, message: 'Admin role requires an organization.' };
    }
  } else if (role === 'editor') {
    updateData.appRole = 'user';
    updateData.orgRole = 'editor';
    if (!userData.organizationId) {
      return { success: false, message: 'Editor role requires an organization.' };
    }
  } else { // role === 'user'
    updateData.appRole = 'user';
    updateData.orgRole = 'member';
     if (!userData.organizationId) {
      return { success: false, message: 'User role requires an organization.' };
    }
  }

  try {
    await updateDoc(doc(db, "users", uid), updateData);
    return {
      success: true,
      message: `User ${userData.name} has been updated.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Database Error: ${error.message}`,
    };
  }
}

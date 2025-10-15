
# Local Focus - Incident Reporting Platform

This is a Next.js application built with Firebase, ShadCN UI, and Tailwind CSS. It serves as a platform for reporting, tracking, and analyzing incidents across different organizations.

## Table of Contents

- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Deployment Order](#deployment-order)
- [Application Structure](#application-structure)
- [User Roles & Permissions](#user-roles--permissions)
- [Database Seeding](#database-seeding)

---

## Local Setup

To run this application locally, you will need Node.js and npm installed.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set Up Environment Variables:**
    Create a `.env.local` file in the root of the project and add the necessary Firebase configuration keys (see [Environment Variables](#environment-variables) below).

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

---

## Environment Variables

The application requires Firebase client configuration to connect to your Firebase project. Create a `.env.local` file and populate it with the configuration from your Firebase project settings:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:your-app-id
```

You can find these values in the Firebase console:
*Project Settings* > *General* > *Your apps* > *Firebase SDK snippet* > *Config*.


---
## Deployment Order

To deploy the application and its backend services correctly, follow this sequence:

1.  **Deploy Firestore Indexes:**
    ```bash
    firebase deploy --only firestore:indexes
    ```
    This ensures that your database can support all the required queries before the application and rules are live.

2.  **Deploy Firestore Rules:**
    ```bash
    firebase deploy --only firestore:rules
    ```
    This applies the security model to your database. It's crucial to do this before deploying functions or the app to prevent unauthorized access.

3.  **Deploy Cloud Functions:**
    ```bash
    firebase deploy --only functions
    ```
    This deploys the backend logic, including the `transitionIncidentStatus` callable function.

4.  **Deploy the Web Application (Hosting):**
    ```bash
    firebase deploy --only hosting
    ```
    This deploys the Next.js application to Firebase Hosting.

---

## Application Structure

-   `/src/app`: Main application routes (using Next.js App Router).
    -   `/(main)`: Authenticated application routes.
    -   `/(main)/admin`: Routes and pages for administrative functions.
    -   `/page.tsx`: The main login page.
    -   `/layout.tsx`: The root layout, which includes the Firebase client provider.
-   `/src/components`: Reusable React components.
    -   `/ui`: ShadCN UI components.
    -   `/admin`: Components specific to the admin section.
    -   `/auth`: Authentication-related components (login form, etc.).
-   `/src/hooks`: Custom React hooks (`useAuth`, `useIncidents`, etc.).
-   `/src/lib`: Core application logic, types, and utilities.
    -   `firebase.ts`: Firebase initialization.
    -   `types.ts`: TypeScript type definitions for all major data models.
    -   `schemas`: Directory for Zod schemas for form validation.
    -   `paths.ts`: Centralized Firestore collection paths.
-   `/public`: Static assets like images and the `firebase-messaging-sw.js` service worker.
-   `/functions`: Source code for Firebase Cloud Functions.
-   `firestore.rules`: Firebase Security Rules for the database.
-   `firestore.indexes.json`: Composite indexes required for complex Firestore queries.

---

## User Roles & Permissions

The application uses a role-based access control (RBAC) system. A user's capabilities are determined by their `role` and their assigned `organizationId`.

#### Organizations:
1.  **Local Focus**: The primary, internal organization that manages the platform. Identified by `organizationId: 'LOCAL_FOCUS_ORG_ID'`.
2.  **External Organizations**: Partner or client organizations that use the platform.

#### Roles:
1.  **SuperAdmin** (Local Focus Only):
    -   **Access**: Full system access. Can see and manage all data across all organizations.
    -   **Key Responsibilities**: Initial database seeding, system configuration, managing all users and permissions.

2.  **Admin** (Local Focus Only):
    -   **Access**: Nearly full system access. Can manage users, organizations, and permissions.
    -   **Key Responsibilities**: Day-to-day administration, content moderation, user support, publishing incidents from external orgs.

3.  **Editor** (Local Focus Only):
    -   **Access**: Content management access. Can create, edit, and manage incidents, categories, reports, and messages.
    -   **Restrictions**: Cannot manage users, organizations, or system-wide permissions.

4.  **User** (Local Focus):
    -   **Access**: Basic internal access. Can view the dashboard, incidents, and reports.
    -   **Restrictions**: No administrative capabilities.

5.  **orgAdmin** (External Orgs):
    -   **Access**: Administrative access limited to their own organization.
    -   **Key Responsibilities**: Managing their organization's users, creating incidents (which go into a review queue), viewing approved reports.

6.  **User** (External Orgs):
    -   **Access**: Basic access limited to their own organization's context.
    -   **Key Responsibilities**: Creating incidents (pending review), viewing public data and data shared with their organization.

---

## Database Seeding

For first-time setup, the database needs to be seeded with essential data (like the Local Focus organization and admin users).

-   Navigate to **/admin/tools/seeder**.
-   This page contains buttons to run seeding scripts. These are protected and can only be executed by a logged-in **SuperAdmin**.
-   **Core Seeder**: Initializes the `organizations` collection, creates the `SuperAdmin` and `Admin` auth users, and sets up placeholder collections.
-   **Location Seeder**: Populates the `locations` collection with a large set of hierarchical geographical data for both Palestine and Israel.

**Warning**: Seeding operations are destructive and should only be run once during initial setup.

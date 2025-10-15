# **App Name**: Local Focus

## Core Features:

- PDF Report Upload: Admins can upload monthly and weekly PDF reports.
- Incident Reporting: Admins can create, edit, and delete incident reports with title, description, picture/video, category, location, date/time, and status.
- Category Management: Admins can add, edit, update, and delete categories for classifying incidents.
- User Invitation Only: Self-registration is disabled. Admins can invite new users via email and CSV file upload. Organization admins can be sub-admins for their domain emails. Firebase Auth handles accounts.
- Role-Based Access: - Admin: Full access.
- Sub Admin/Editor: Full access to write new incidents.
- Standard User: Read-only; can send reports with picture/video for admin review. Gets notifications with distance from incidents and assigned reports with date filters.
- Map Integration: Incidents are shown as map markers. Clicking a marker opens a card with title + summary, linking to the full report.
- Incident Feed: Chronological feed of reports with infinite scroll. Each report displayed in a clean card format.
- Location Normalization Tool: When admins type a location, the app proposes normalized versions. If multiple options exist, users can manually pick the correct one.

## Style Guidelines:

- Primary Color: Orange (#FF7A00) → vibrant and strong identity.
- Background Color: Off-white / light beige (#FAFAF7).
- Accent Color: Dark Gray (#333333) for text and UI contrast.
- Typography: Use 'PT Sans' for all body and headings.
- Card-based UI for incidents and categories.
- Minimalist category icons for clarity.
- Subtle transitions when opening reports or applying filters.
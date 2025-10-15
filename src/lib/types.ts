
import type { Timestamp } from 'firebase/firestore';

export type Role = 'SuperAdmin' | 'Admin' | 'Editor' | 'orgAdmin' | 'User';

export type MemberStatus = 'active' | 'invited' | 'pending' | 'disabled';
export type IncidentStatus = 'Draft' | 'Review' | 'Approved' | 'Published' | 'Live' | 'Closed';
export type ImpactStatus = 'low' | 'medium' | 'high' | 'critical';
export type Visibility = 'private' | 'public';
export type PresenceState = 'online' | 'offline';

export interface AppPermissions {
    viewIncidents: boolean;
    createIncidents: boolean;
    editIncidents: boolean;
    deleteIncidents: boolean;
    viewReports: boolean;
    viewAIReports: boolean;
    generateAIReports: boolean;
    viewQuotes: boolean;
    manageUsers: boolean;
    manageCategories: boolean;
    manageSettings: boolean;
    lastUpdated?: Timestamp;
    inheritedFromOrg?: boolean;
}


export interface AccessRights {
    canViewPublicIncidents: boolean;
    canViewWeeklyReports: boolean;
    canViewMonthlyReports: boolean;
    canViewAiReports: boolean;
}

export interface UserPresence {
  state: PresenceState;
  last_changed: number;
}

export interface User {
    id: string; 
    uid: string; 
    name: string;
    displayName: string;
    email: string;
    role: Role;
    roles: {
        SuperAdmin?: boolean;
        Admin?: boolean;
        Editor?: boolean;
        orgAdmin?: boolean;
        User?: boolean;
    },
    avatar?: string;
    organizationId: string;
    status: MemberStatus;
    isActive: boolean;
    disabled?: boolean;
    invitedBy?: string;
    invitedAt?: Timestamp;
    joinedAt?: Timestamp;
    fcmTokens?: string[];
    presence?: UserPresence;
    accessRights?: AccessRights;
    overrides?: Partial<AccessRights>;
    permissions?: Partial<AppPermissions>;
    editorCanModerate?: boolean;
    canManageUsers?: boolean;
    canEditIncidents?: boolean;
    canEditReports?: boolean;
    canManageCategories?: boolean;
    canGenerateAiReports?: boolean;
    canViewWeeklyReports?: boolean;
    canViewMonthlyReports?: boolean;
    canViewLocationAnalytics?: boolean;
    createdAt?: any;
    updatedAt?: any;
    appRole?: 'Owner' | 'Admin' | 'User';
    orgRole?: 'org_admin' | 'editor' | 'member' | null;
    position?: string;
    fullName?: string;
}

export interface Organization {
    id: string;
    name:string;
    domain: string;
    type: "core" | "external";
    maxUsers: number;
    currentUsers: number;
    hasOrgAdmin: boolean;
    isActive: boolean;
    description?: string;
    accessRights?: AccessRights;
    permissions?: AppPermissions;
    createdBy?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    // New fields from quote
    emailDomain?: string;
    contactPerson?: string;
    contactEmail?: string;
    phone?: string;
    services?: {
        instantIncidents?: boolean;
        weeklyReports?: boolean;
        monthlyReports?: boolean;
        aiReports?: boolean;
        other?: boolean;
        otherMessage?: string | null;
    };
    name_normalized?: string;
}

export interface AccessGrant {
    id: string;
    sourceOrgId: string;
    targetOrgId: string;
    resourceTypes: ("incidents" | "reports" | "weeklyReports" | "monthlyReports" | "aiGeneratedReports")[];
    visibilityLevel: "global" | "regional" | "locationScoped";
    allowedLocations: string[]; // List of location IDs
    active: boolean;
    createdAt: Timestamp;
    expiresAt: Timestamp | null;
}


export interface SubCategory {
    id: string;
    name: string;
    description?: string;
    createdBy?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Category {
    id: string;
    name: string;
    organizationId: string;
    description?: string;
    createdBy?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Location {
    id: string;
    name: string;
    country: "Palestine" | "Israel" | null;
    region: string | null;
    governorate: string | null;
    district: string | null;
    city: string | null;
    village: string | null;
    refugeeCamp: string | null;
    settlement: string | null;
    streetName: string | null;
    type: "country" | "region" | "governorate" | "district" | "city" | "village" | "refugee_camp" | "settlement" | "street";
    parentId: string | null;
    coordinates: { lat: number; lng: number };
    createdAt?: Timestamp;
    createdBy?: string;
}

export interface StatusHistoryEntry {
  changedAt: Timestamp;
  changedBy: string;
  changedByName: string;
  previousStatus: IncidentStatus;
  newStatus: IncidentStatus;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  imageId: string;
  
  categoryId: string;
  subCategoryId?: string;
  
  organizationId: string;
  
  location: string;
  locationId: string;
  fullLocationPath: string;
  coordinates: { lat: number; lng: number }; 
  
  impactStatus: ImpactStatus;
  status: IncidentStatus;
  visibility: Visibility;

  editorialNotes?: string | null;
  
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;

  approvedBy?: string | null;
  approvedAt?: Timestamp | null;
  
  publishedBy?: string | null;
  publishedAt?: Timestamp | null;

  statusHistory?: StatusHistoryEntry[];
  views?: number;
  
  // Client-side computed property
  date?: Date;
}

export interface ReportData {
    totalIncidents: number;
    categoryCounts: Record<string, number>;
    subCategoryCounts: Record<string, number>;
    metrics: {
        killed: number;
        injured: number;
        arrested: number;
        rockets: number;
        accidents: number;
    };
    importantEvents: {
        title: string;
        summary: string;
    }[];
    narrativeSummary: string;
    heatmap?: { lat: number; lng: number; count: number }[];
}


export interface Report {
    id: string;
    type: 'weekly' | 'monthly';
    isAiGenerated: boolean;
    data?: ReportData;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    periodDate?: Date;
    visibility?: Visibility;
    organizationId?: string;
    generatedBy: string;
    generatedAt: any;
}

export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'in_progress';

export interface Quote {
  id: string;
  orgId: string | null; // This will be linked upon approval
  orgName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
  services: {
    instantIncidents?: boolean;
    weeklyReports?: boolean;
    monthlyReports?: boolean;
    aiReports?: boolean;
    other?: boolean;
  };
  customMessage: string;
  status: QuoteStatus;
  assignedTo: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  _path?: string; // For client-side use with collectionGroup queries
  organizationId?: string; // From subcollection parent
  organizationName?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface DeletionRequest {
    id: string;
    collection: string;
    documentId: string;
    requestedBy: string;
    status: 'pending' | 'approved' | 'denied';
    createdAt: Timestamp;
    processedAt?: Timestamp;
}

export interface AnalyticsData {
    totalMessages: number;
    activeChats: number;
    messagesByOrg: { name: string; value: number }[];
    topSenders: { uid: string; name: string; org: string; count: number }[];
    activeChatsOverTime: { date: string; count: number }[];
}


// Messaging System Types
export interface Chat {
    id: string;
    isGroup: boolean;
    name?: string;
    description?: string;
    participants: string[];
    participantOrgs: string[];
    createdBy: string;
    createdAt: Timestamp;
    lastMessageAt?: Timestamp;
    lastMessageText?: string;
    lastMessageSenderId?: string;
    orgId?: string; // For org-scoped groups
    visibility: 'internal' | 'cross_org';
    unreadCount?: { [uid: string]: number };
    
    // client-side properties
    participantDetails?: (Pick<User, 'uid' | 'name' | 'avatar' | 'organizationId'> & { presence?: UserPresence })[];
    lastMessageSenderName?: string;
    groupName?: string; // a computed name for DMs
    updatedAt: Timestamp;
}

export interface Attachment {
    url: string;
    type: 'image' | 'video' | 'file' | 'audio';
    name: string;
}

export interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderOrg: string;
    createdAt: Timestamp;
    seenBy: string[];
    attachments?: Attachment[];
    
    // Optional for media messages
    type?: 'text' | 'image' | 'file' | 'video' | 'audio';
    imageUrl?: string;
    videoUrl?: string;
    fileUrl?: string;
}

export interface TypingUser {
    uid: string;
    name: string;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    attachments: Attachment[];
    targetOrgs: string[];
    createdBy: string;
    createdByName: string;
    createdAt: Timestamp;
    pinned: boolean;
    search?: string; // for search indexing
}


// Notification System Types
export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: "incident_update" | "ai_report_ready" | "system" | "message" | "announcement";
    link?: string;
    read: boolean;
    createdAt: Timestamp;
}


// Search System Types
export type SearchScope = 'messages' | 'users' | 'announcements';

export interface SearchQuery {
    term: string;
    scope: SearchScope;
    orgIds?: string[];
    from?: Date;
    to?: Date;
    hasAttachments?: boolean;
    senders?: string[];
}

export interface SearchResult<T> {
    scope: SearchScope;
    results: T[];
}

export interface MessageSearchResult {
    id: string;
    chatId: string;
    chatName: string;
    text: string;
    snippet: string;
    senderId: string;
    senderName: string;
    createdAt: Timestamp;
}

// Permissions Audit Log Types
export interface PermissionChange {
  key: keyof AppPermissions;
  from: boolean | null;
  to: boolean | null;
}

export interface PermissionLog {
  id: string;
  orgId: string;
  orgName: string;
  userId: string | null;
  userEmail: string | null;
  scope: 'organization' | 'user';
  action: 'set' | 'update' | 'reset';
  actorId: string;
  actorEmail: string;
  changed: PermissionChange[];
  keys: (keyof AppPermissions)[]; // For indexing
  createdAt: Timestamp;
  notes?: string | null;
}

// Bulk Import Log Types
export interface ImportLog {
    id: string;
    importedBy: string;
    organizationId: string;
    collection: 'users' | 'organizations';
    totalRows: number;
    successCount: number;
    failedCount: number;
    failedRows: { row: number; email: string; reason: string }[];
    timestamp: Timestamp;
}

// Admin Audit Log Types
export type AdminActionType = 'IMPORT' | 'INVITE_RESENT' | 'USER_DEACTIVATED' | 'USER_ACTIVATED' | 'USER_EDITED' | 'ROLE_CHANGED';

export interface AdminAuditLog {
  id: string;
  actionType: AdminActionType;
  performedBy: string; // email
  performedByRole: Role;
  targetOrgId?: string;
  targetOrgName?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details: {
    message?: string;
    count?: number;
    success?: number;
    failed?: number;
    from?: any;
    to?: any;
  };
  createdAt: Timestamp;
}

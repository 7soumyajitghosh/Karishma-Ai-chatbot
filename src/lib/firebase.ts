import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Set Firestore log level to silent to suppress internal gRPC idle stream cycling messages
try {
  setLogLevel("silent");
} catch {
  // Ignore if already set or not supported in environment
}

// Use specified databaseId if present and not default
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

function createFirestoreInstance() {
  const settings = {
    experimentalAutoDetectLongPolling: true,
  };
  try {
    if (dbId) {
      return initializeFirestore(app, settings, dbId);
    }
    return initializeFirestore(app, settings);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);

// Error Handling according to Firebase Skill standard
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

// Authenticate anonymously if not logged in to satisfy Firestore security rules
let authPromise: Promise<any> | null = null;

export const ensureFirebaseAuth = async () => {
  if (auth.currentUser) return auth.currentUser;
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((userCred) => userCred.user)
      .catch((err) => {
        console.warn("Firebase Auth anonymous sign-in error:", err);
        authPromise = null;
        return null;
      });
  }
  return authPromise;
};

// Helper to remove undefined fields recursively for Firestore compatibility
const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
};

export interface SyncMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  citations?: Array<{ title: string; uri: string }>;
  isEncrypted?: boolean;
  reactions?: string[];
  feedback?: "like" | "dislike" | null;
  modelUsed?: string;
  imageAttachment?: any;
  generatedImage?: {
    url: string;
    prompt: string;
  };
}

export interface SyncChatSession {
  id: string;
  title: string;
  timestamp: string;
  updatedAt?: string;
  messages: SyncMessage[];
  mode?: string;
  userId?: string;
  lastSyncedAt?: string;
}

export interface QueueItem {
  id: string; // conversationId
  userId: string;
  type: "upsert" | "delete";
  session?: SyncChatSession;
  queuedAt: number;
}

// Sanitize user ID for Firestore path compliance
export const getCleanUserId = (user: { id?: string; email?: string } | null | string): string => {
  const getGuestId = () => {
    let guestId: string | null = null;
    try {
      guestId = localStorage.getItem("best_friend_guest_uid");
    } catch {}
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 10);
      try {
        localStorage.setItem("best_friend_guest_uid", guestId);
      } catch {}
    }
    return guestId;
  };

  if (!user) {
    return getGuestId();
  }
  if (typeof user === "string") {
    return user.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  const idStr = user.id || (user.email ? `usr_${user.email.trim().toLowerCase()}` : null);
  if (!idStr) {
    return getGuestId();
  }
  return idStr.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
};

/**
 * Merge messages from local and cloud sources preventing duplicates and preserving rich metadata
 */
export const mergeSyncMessages = (localMsgs: SyncMessage[] = [], cloudMsgs: SyncMessage[] = []): SyncMessage[] => {
  const map = new Map<string, SyncMessage>();

  // Add cloud messages first
  for (const m of cloudMsgs) {
    if (m && m.id) {
      map.set(m.id, { ...m });
    }
  }

  // Merge local messages safely
  for (const m of localMsgs) {
    if (!m || !m.id) continue;
    if (!map.has(m.id)) {
      map.set(m.id, { ...m });
    } else {
      const existing = map.get(m.id)!;
      map.set(m.id, {
        ...existing,
        ...m,
        text: existing.text || m.text,
        reactions: Array.from(new Set([...(existing.reactions || []), ...(m.reactions || [])])),
        feedback: m.feedback !== undefined ? m.feedback : existing.feedback,
        citations: m.citations || existing.citations,
        imageAttachment: m.imageAttachment || existing.imageAttachment,
        generatedImage: m.generatedImage || existing.generatedImage,
      });
    }
  }

  const list = Array.from(map.values());
  list.sort((a, b) => {
    const tA = new Date(a.timestamp || 0).getTime();
    const tB = new Date(b.timestamp || 0).getTime();
    if (tA !== tB) return tA - tB;
    return a.id.localeCompare(b.id);
  });

  return list;
};

/**
 * Offline Sync Queue Helpers
 */
export const getQueueStorageKey = (userId: string) => `best_friend_sync_queue_${userId}`;

export const getPendingSyncQueue = (userIdRaw: { id?: string; email?: string } | null | string): QueueItem[] => {
  const userId = getCleanUserId(userIdRaw);
  try {
    const raw = localStorage.getItem(getQueueStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePendingSyncQueue = (userIdRaw: { id?: string; email?: string } | null | string, queue: QueueItem[]) => {
  const userId = getCleanUserId(userIdRaw);
  try {
    localStorage.setItem(getQueueStorageKey(userId), JSON.stringify(queue));
  } catch {}
};

export const enqueueSyncOperation = (
  userIdRaw: { id?: string; email?: string } | null | string,
  type: "upsert" | "delete",
  conversationId: string,
  session?: SyncChatSession
) => {
  const userId = getCleanUserId(userIdRaw);
  const queue = getPendingSyncQueue(userId);

  // Remove existing queued operations for this conversationId
  const filtered = queue.filter(item => item.id !== conversationId);

  filtered.push({
    id: conversationId,
    userId,
    type,
    session,
    queuedAt: Date.now()
  });

  savePendingSyncQueue(userId, filtered);
};

export const removeFromSyncQueue = (userIdRaw: { id?: string; email?: string } | null | string, conversationId: string) => {
  const userId = getCleanUserId(userIdRaw);
  const queue = getPendingSyncQueue(userId);
  const filtered = queue.filter(item => item.id !== conversationId);
  savePendingSyncQueue(userId, filtered);
};

/**
 * Flush pending offline operations when network is available
 */
export const flushPendingSyncQueue = async (
  userIdRaw: { id?: string; email?: string } | null | string
): Promise<boolean> => {
  const userId = getCleanUserId(userIdRaw);
  const queue = getPendingSyncQueue(userId);

  if (queue.length === 0) return true;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  let allSuccess = true;

  for (const item of [...queue]) {
    try {
      if (item.type === "delete") {
        const ok = await deleteConversationFromCloud(userId, item.id, false);
        if (!ok) allSuccess = false;
      } else if (item.type === "upsert" && item.session) {
        const ok = await saveConversationToCloud(userId, item.session, false);
        if (!ok) allSuccess = false;
      }
    } catch {
      allSuccess = false;
    }
  }

  return allSuccess;
};

/**
 * Save or update a single conversation in Firestore with conflict-resolution
 */
export const saveConversationToCloud = async (
  userIdRaw: { id?: string; email?: string } | null | string,
  session: SyncChatSession,
  enqueueOnFailure: boolean = true
): Promise<boolean> => {
  const userId = getCleanUserId(userIdRaw);
  const docPath = `users/${userId}/conversations/${session.id}`;

  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (enqueueOnFailure) enqueueSyncOperation(userId, "upsert", session.id, session);
      return false;
    }

    await ensureFirebaseAuth();

    const docRef = doc(db, "users", userId, "conversations", session.id);
    const nowIso = new Date().toISOString();

    // Check existing cloud version to prevent overwriting newer cloud data with older local data
    let mergedSession: SyncChatSession = { ...session };
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const cloudData = snap.data() as SyncChatSession;
        const cloudTime = new Date(cloudData.updatedAt || cloudData.timestamp || 0).getTime();
        const localTime = new Date(session.updatedAt || session.timestamp || 0).getTime();

        const mergedMsgs = mergeSyncMessages(session.messages || [], cloudData.messages || []);

        // Title selection logic: prefer non-generic titles
        let finalTitle = session.title;
        if (!finalTitle || finalTitle === "New Conversation") {
          finalTitle = cloudData.title || session.title;
        } else if (cloudTime > localTime && cloudData.title && cloudData.title !== "New Conversation") {
          finalTitle = cloudData.title;
        }

        const latestUpdated = new Date(Math.max(cloudTime, localTime, Date.now())).toISOString();

        mergedSession = {
          id: session.id,
          title: finalTitle,
          timestamp: cloudData.timestamp || session.timestamp || nowIso,
          updatedAt: latestUpdated,
          messages: mergedMsgs,
          mode: session.mode || cloudData.mode || "normal",
          userId: userId,
          lastSyncedAt: nowIso
        };
      }
    } catch (readErr) {
      console.warn("Could not read existing cloud doc prior to save, proceeding with optimistic save:", readErr);
    }

    const payload = sanitizeForFirestore({
      id: mergedSession.id,
      title: mergedSession.title || "New Conversation",
      timestamp: mergedSession.timestamp || nowIso,
      updatedAt: mergedSession.updatedAt || nowIso,
      messages: mergedSession.messages || [],
      mode: mergedSession.mode || "normal",
      userId: userId,
      lastSyncedAt: nowIso
    });

    await setDoc(docRef, payload, { merge: true });
    removeFromSyncQueue(userId, session.id);
    return true;
  } catch (err) {
    const formattedError = handleFirestoreError(err, OperationType.WRITE, docPath);
    console.error("Failed to save conversation to cloud:", formattedError);
    if (enqueueOnFailure) {
      enqueueSyncOperation(userId, "upsert", session.id, session);
    }
    return false;
  }
};

/**
 * Delete a single conversation from Firestore
 */
export const deleteConversationFromCloud = async (
  userIdRaw: { id?: string; email?: string } | null | string,
  conversationId: string,
  enqueueOnFailure: boolean = true
): Promise<boolean> => {
  const userId = getCleanUserId(userIdRaw);
  const docPath = `users/${userId}/conversations/${conversationId}`;

  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (enqueueOnFailure) enqueueSyncOperation(userId, "delete", conversationId);
      return false;
    }

    await ensureFirebaseAuth();

    const docRef = doc(db, "users", userId, "conversations", conversationId);
    await deleteDoc(docRef);
    removeFromSyncQueue(userId, conversationId);
    return true;
  } catch (err) {
    const formattedError = handleFirestoreError(err, OperationType.DELETE, docPath);
    console.error("Failed to delete conversation from cloud:", formattedError);
    if (enqueueOnFailure) {
      enqueueSyncOperation(userId, "delete", conversationId);
    }
    return false;
  }
};

/**
 * Real-time listener for user conversations
 */
export const subscribeToUserConversations = (
  userIdRaw: { id?: string; email?: string } | null | string,
  onUpdate: (sessions: SyncChatSession[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const userId = getCleanUserId(userIdRaw);
  const colPath = `users/${userId}/conversations`;
  let unsub: (() => void) | null = null;
  let isCancelled = false;

  ensureFirebaseAuth().then(() => {
    if (isCancelled) return;
    const conversationsRef = collection(db, "users", userId, "conversations");
    const q = query(conversationsRef, orderBy("updatedAt", "desc"));

    unsub = onSnapshot(
      q,
      (snapshot) => {
        const cloudSessionsMap = new Map<string, SyncChatSession>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          cloudSessionsMap.set(docSnap.id, {
            id: docSnap.id,
            title: data.title || "New Conversation",
            timestamp: data.timestamp || new Date().toISOString(),
            updatedAt: data.updatedAt || data.timestamp || new Date().toISOString(),
            messages: Array.isArray(data.messages) ? data.messages : [],
            mode: data.mode || "normal",
            userId: data.userId || userId
          });
        });

        // Overlay pending local queue for offline optimistic responsiveness
        const pendingQueue = getPendingSyncQueue(userId);

        for (const queuedItem of pendingQueue) {
          if (queuedItem.type === "delete") {
            cloudSessionsMap.delete(queuedItem.id);
          } else if (queuedItem.type === "upsert" && queuedItem.session) {
            const existing = cloudSessionsMap.get(queuedItem.id);
            if (existing) {
              const mergedMsgs = mergeSyncMessages(queuedItem.session.messages || [], existing.messages || []);
              cloudSessionsMap.set(queuedItem.id, {
                ...existing,
                ...queuedItem.session,
                messages: mergedMsgs,
                updatedAt: new Date(Math.max(
                  new Date(existing.updatedAt || 0).getTime(),
                  new Date(queuedItem.session.updatedAt || 0).getTime()
                )).toISOString()
              });
            } else {
              cloudSessionsMap.set(queuedItem.id, queuedItem.session);
            }
          }
        }

        const finalSessions = Array.from(cloudSessionsMap.values());
        finalSessions.sort((a, b) => new Date(b.updatedAt || b.timestamp || 0).getTime() - new Date(a.updatedAt || a.timestamp || 0).getTime());

        onUpdate(finalSessions);
      },
      (err) => {
        // Code 1 (CANCELLED) / idle stream disconnect is standard Firestore stream cycling behavior
        const isIdleDisconnect = (err as any)?.code === 'cancelled' || (err as any)?.code === 1 || err?.message?.includes("Disconnecting idle stream");
        if (isIdleDisconnect) {
          // Stream will reconnect automatically on next target request
          return;
        }
        const formattedErr = handleFirestoreError(err, OperationType.LIST, colPath);
        console.warn("Firestore subscription notice:", formattedErr);
        if (onError) onError(formattedErr);
      }
    );
  }).catch((err) => {
    const formattedErr = handleFirestoreError(err, OperationType.GET, colPath);
    console.error("Error setting up Firebase Auth:", formattedErr);
    if (onError) onError(formattedErr);
  });

  return () => {
    isCancelled = true;
    if (unsub) {
      unsub();
    }
  };
};

/**
 * Batch upload / sync all local sessions to cloud safely without deleting existing cloud sessions
 */
export const syncAllLocalSessionsToCloud = async (
  userIdRaw: { id?: string; email?: string } | null | string,
  sessions: SyncChatSession[]
): Promise<boolean> => {
  if (!sessions || sessions.length === 0) return true;
  try {
    const userId = getCleanUserId(userIdRaw);
    await ensureFirebaseAuth();

    for (const session of sessions) {
      if (session && session.id) {
        await saveConversationToCloud(userId, session);
      }
    }
    return true;
  } catch (err) {
    console.error("Failed to sync local sessions to cloud:", err);
    return false;
  }
};

// Global network listener to auto-flush queue when connection is restored
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    try {
      const activeUserRaw = localStorage.getItem("best_friend_active_user");
      const activeUser = activeUserRaw ? JSON.parse(activeUserRaw) : null;
      flushPendingSyncQueue(activeUser);
    } catch {}
  });
}

import { User, Admin, CurrentUser, AppConfig, Instance, LogEntry } from '../types';
import { db, auth } from './firebase';
import { ref, get, set, remove, child, update } from "firebase/database";
import { signInAnonymously } from "firebase/auth";

const ADMIN_USER = "gsadmin";
const ADMIN_PASS = "gsadmin";
const SESSION_KEY = "ff_bot_session";

// --- Helper: Ensure Auth ---
const ensureAuth = async () => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.warn("Anonymous auth failed (proceeding as guest):", error);
    }
  }
};

const handleFirebaseError = (error: any) => {
  console.error("Firebase Error:", error);
  if (error.code === 'PERMISSION_DENIED' || error.message?.includes('Permission denied')) {
     alert("⚠️ FIREBASE CONNECTION ERROR ⚠️\n\nThe app cannot connect to the database.\n\n1. Check your internet.\n2. In Firebase Console > Realtime Database > Rules, ensure they are:\n\n{\n  \"rules\": {\n    \".read\": true,\n    \".write\": true\n  }\n}");
  }
  return null;
};

// --- App Config Logic (Now Global via Firebase) ---
// Fetches config from 'system_config' node in DB
export const fetchAppConfig = async (): Promise<AppConfig> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'system_config'));
    if (snapshot.exists()) {
      return snapshot.val() as AppConfig;
    } else {
      return { contactLink: '#', youtubeLink: '#', dashboardInstructions: '' };
    }
  } catch (e) {
    console.error("Failed to fetch config", e);
    return { contactLink: '#', youtubeLink: '#', dashboardInstructions: '' };
  }
};

// Saves config to 'system_config' node in DB
export const saveAppConfig = async (config: AppConfig) => {
  await ensureAuth();
  try {
    await set(ref(db, 'system_config'), config);
  } catch (error) {
    handleFirebaseError(error);
    throw error;
  }
};

// --- User Logic (Firebase) ---

// Exported sanitize so it can be used in other files if needed, primarily for key consistency
export const sanitize = (username: string) => username.replace(/[.#$/[\]]/g, "_");

export const fetchUsers = async (): Promise<User[]> => {
  await ensureAuth();
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `users`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Safe convert to array
      const userList = Object.values(data) as User[];
      
      // Additional sanitization: Ensure allowedBots is array for all users
      return userList.map(u => ({
          ...u,
          allowedBots: Array.isArray(u.allowedBots) ? u.allowedBots : (u.allowedBots && typeof u.allowedBots === 'object' ? Object.values(u.allowedBots) : [])
      }));
    } else {
      return [];
    }
  } catch (error) {
    handleFirebaseError(error);
    return [];
  }
};

export const login = async (username: string, password: string): Promise<{ success: boolean; user?: CurrentUser; message?: string }> => {
  // Check Admin (Hardcoded)
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const admin: Admin = { username, role: 'admin' };
    localStorage.setItem(SESSION_KEY, JSON.stringify(admin));
    return { success: true, user: admin };
  }

  await ensureAuth();

  try {
    const dbRef = ref(db);
    const sanitizedName = sanitize(username);
    const snapshot = await get(child(dbRef, `users/${sanitizedName}`));

    if (snapshot.exists()) {
      const user = snapshot.val() as User;
      
      if (user.password === password) {
        if (Date.now() > user.expiryDate) {
           return { success: false, message: "Account Expired. Contact Admin." };
        }
        
        // --- SANITIZATION ON LOGIN ---
        // Ensure allowedBots is an array, not an object/map
        if (user.allowedBots && typeof user.allowedBots === 'object' && !Array.isArray(user.allowedBots)) {
            user.allowedBots = Object.values(user.allowedBots);
        }

        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return { success: true, user };
      } else {
        return { success: false, message: "Invalid credentials" };
      }
    } else {
      return { success: false, message: "User not found" };
    }
  } catch (error) {
    console.error("Login DB error", error);
    const errMsg = (error as any).code === 'PERMISSION_DENIED' ? "Database Locked (Check Rules)" : "Connection failed";
    return { success: false, message: errMsg };
  }
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSession = (): CurrentUser | null => {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const user = JSON.parse(session);
    
    // Sanitize session user as well just in case
    if (user.role === 'user') {
         if (Date.now() > (user as User).expiryDate) {
            logout();
            return null;
         }
         if (user.allowedBots && typeof user.allowedBots === 'object' && !Array.isArray(user.allowedBots)) {
            user.allowedBots = Object.values(user.allowedBots);
         }
    }

    return user;
  } catch (e) {
    logout();
    return null;
  }
};

export const createUser = async (user: User) => {
  await ensureAuth();
  try {
      const sanitizedName = sanitize(user.username);
      const userRef = ref(db, 'users/' + sanitizedName);
      
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
          throw new Error("Username already exists");
      }

      await set(userRef, user);
  } catch (error) {
      handleFirebaseError(error);
      throw error;
  }
};

export const deleteUser = async (username: string) => {
  await ensureAuth();
  try {
      const sanitizedName = sanitize(username);
      await remove(ref(db, 'users/' + sanitizedName));
  } catch (error) {
      handleFirebaseError(error);
  }
};

export const restoreUsers = async (users: User[]) => {
    await ensureAuth();
    try {
        const updates: any = {};
        users.forEach(user => {
            const sanitizedName = sanitize(user.username);
            updates['users/' + sanitizedName] = user;
        });
        await update(ref(db), updates);
    } catch (error) {
        handleFirebaseError(error);
    }
};

// --- Data Persistence Logic (Updated for Safety) ---

export const fetchUserSession = async (username: string): Promise<{ instances: Instance[], logs: LogEntry[] }> => {
  await ensureAuth();
  
  // We do NOT try/catch here to mask errors. If DB is unreachable, we want the UI to know
  // so it doesn't assume empty data and overwrite valid data.
  const sName = sanitize(username);
  const dbRef = ref(db);
  
  const [instSnap, logSnap] = await Promise.all([
    get(child(dbRef, `users/${sName}/instances`)),
    get(child(dbRef, `users/${sName}/logs`))
  ]);

  return {
    instances: instSnap.exists() ? instSnap.val() : [],
    logs: logSnap.exists() ? logSnap.val() : []
  };
};

export const saveUserInstances = async (username: string, instances: Instance[]) => {
  await ensureAuth();
  try {
    const sName = sanitize(username);
    
    // CRITICAL FIX: Firebase throws if any value is `undefined`.
    // We use JSON.parse(JSON.stringify(obj)) to strip all undefined keys automatically.
    // This is safer than manual sanitation.
    // If an array element becomes null, Firebase set handles it by indexing the object keys (e.g. "0", "1")
    const cleanInstances = JSON.parse(JSON.stringify(instances));
    
    await set(ref(db, `users/${sName}/instances`), cleanInstances);
  } catch (error) {
    console.error("Error saving instances", error);
  }
};

export const saveUserLogs = async (username: string, logs: LogEntry[]) => {
  await ensureAuth();
  try {
    const sName = sanitize(username);
    // Limit logs to last 50 and sanitize undefined values
    const slicedLogs = logs.slice(-50); 
    const cleanLogs = JSON.parse(JSON.stringify(slicedLogs));
    await set(ref(db, `users/${sName}/logs`), cleanLogs);
  } catch (error) {
    console.error("Error saving logs", error);
  }
};
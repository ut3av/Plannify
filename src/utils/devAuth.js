/**
 * Developer Access Control & Intellectual Property Verification Utility
 * Plannify Academic OS
 * Intellectual Property held by Ut3av & SujaL
 */

export const DEV_RESTRICTION_TITLE = "Private Development Mode — Restricted Access";

export const DEV_RESTRICTION_MESSAGE = 
  "This Software and app is currently under active development, and only the authorized developers have access to go through and interact with it, as it is the intellectual property held by Ut3av & SujaL.";

export const DEV_RESTRICTION_SHORT = 
  "Under active development. Access restricted exclusively to developers (Ut3av & SujaL).";

// Sole Authorized Developer Password
export const DEVELOPER_MASTER_PASSWORD = "Pandey001#887283#";

// Whitelisted developer emails
const AUTHORIZED_DEV_EMAILS = [
  "ut3av@plannify.dev",
  "sujal@plannify.dev",
  "developer@plannify.dev",
  "admin@plannify.dev"
];

const STORAGE_KEY = "plannify_developer_session";

/**
 * Validates the developer master password
 */
export function verifyDeveloperKey(inputKey) {
  if (!inputKey || typeof inputKey !== "string") return false;
  return inputKey.trim() === DEVELOPER_MASTER_PASSWORD;
}

/**
 * Checks if an email is in the developer whitelist
 */
export function isDeveloperEmail(email) {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  return AUTHORIZED_DEV_EMAILS.some(devEmail => clean === devEmail);
}

/**
 * Creates a standard Developer User object with full administrative rights
 */
export function createDeveloperUser(devName = "Ut3av & SujaL") {
  return {
    id: "dev-master-ut3av-sujal",
    email: "ut3av@plannify.dev",
    name: devName,
    teacher_name: `${devName} (Lead Developer)`,
    full_name: `${devName} (System Architect)`,
    role: "Admin",
    isDeveloper: true,
    department: "System Architecture & Core Engine",
    designation: "Lead Developer & IP Owner",
    employee_id: "DEV-IP-001",
    phone: "+91-9876543210",
    developer_verified_at: new Date().toISOString()
  };
}

/**
 * Retrieves the stored developer session from localStorage
 */
export function getDeveloperSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.isDeveloper) {
      return session;
    }
  } catch (e) {
    // Clear corrupted storage
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

/**
 * Stores the developer session in localStorage
 */
export function setDeveloperSession(user = null) {
  if (typeof window === "undefined") return;
  try {
    const devUser = user || createDeveloperUser();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devUser));
    return devUser;
  } catch (e) {
    console.warn("Failed to persist developer session:", e);
    return null;
  }
}

/**
 * Clears the developer session
 */
export function clearDeveloperSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore
  }
}

/**
 * Returns true if a user is an authorized developer
 */
export function isDeveloperUser(user) {
  if (!user) return false;
  if (user.isDeveloper) return true;
  if (isDeveloperEmail(user.email)) return true;
  if (user.id === "dev-master-ut3av-sujal") return true;
  return false;
}

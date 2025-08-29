import { checkIsSecurityError } from "./security-error";

/**
 * Get an item from local storage safely.
 */
export function getItem(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      return localStorage.getItem(key);
    }
    if (typeof sessionStorage !== "undefined" && sessionStorage) {
      return sessionStorage.getItem(key);
    }
    return null;
  } catch (error) {
    if (checkIsSecurityError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Set an item in local storage safely.
 */
export function setItem(key: string, value: string): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(key, value);
      return true;
    }
    if (typeof sessionStorage !== "undefined" && sessionStorage) {
      sessionStorage.setItem(key, value);
      return true;
    }
    return false;
  } catch (error) {
    if (checkIsSecurityError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * Set an item in local storage safely.
 */
export function removeItem(key: string) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.removeItem(key);
    }
  } catch (error) {
    if (checkIsSecurityError(error)) {
      return;
    }
    throw error;
  }
}

const hasLocalStorage = Boolean(
  typeof window !== "undefined" && window.localStorage,
);

export const setItem = (key: string, value: string) => {
  if (!hasLocalStorage) {
    return null;
  }
  return window.localStorage.setItem(key, value);
};

export const getItem = (key: string) => {
  if (!hasLocalStorage) {
    return null;
  }
  return window.localStorage.getItem(key);
};

export const removeItem = (key: string) => {
  if (!hasLocalStorage) {
    return null;
  }
  return window.localStorage.removeItem(key);
};

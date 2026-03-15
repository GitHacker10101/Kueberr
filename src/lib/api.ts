const normalizeApiBase = (value: string | undefined): string => {
  const cleaned = (value ?? "").trim();
  return cleaned.replace(/\/+$/, "");
};

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE);

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};

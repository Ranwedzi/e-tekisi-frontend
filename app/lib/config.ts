/** Backend origin. Set NEXT_PUBLIC_API_URL in .env.local for anything but local dev. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

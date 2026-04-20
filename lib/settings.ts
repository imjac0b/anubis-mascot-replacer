export const ANUBIS_IMAGE_NAMES = ["happy", "pensive", "reject"] as const;

export type AnubisImageName = (typeof ANUBIS_IMAGE_NAMES)[number];

export type MascotSettings = {
  disableMascot: boolean;
  urls: Record<AnubisImageName, string>;
  uploadedImages: Partial<Record<AnubisImageName, string>>;
};

export const DEFAULT_SETTINGS: MascotSettings = {
  disableMascot: false,
  urls: {
    happy: "",
    pensive: "",
    reject: "",
  },
  uploadedImages: {},
};

export const SETTINGS_STORAGE_KEY = "mascotSettings";

export function sanitizeSettings(input: unknown): MascotSettings {
  if (!input || typeof input !== "object") {
    return DEFAULT_SETTINGS;
  }

  const candidate = input as Partial<MascotSettings>;
  const urls =
    candidate.urls && typeof candidate.urls === "object"
      ? (candidate.urls as Partial<Record<AnubisImageName, string>>)
      : {};
  const uploadedImages =
    candidate.uploadedImages && typeof candidate.uploadedImages === "object"
      ? (candidate.uploadedImages as Partial<Record<AnubisImageName, string>>)
      : {};

  return {
    disableMascot: Boolean(candidate.disableMascot),
    urls: {
      happy: typeof urls.happy === "string" ? urls.happy.trim() : "",
      pensive: typeof urls.pensive === "string" ? urls.pensive.trim() : "",
      reject: typeof urls.reject === "string" ? urls.reject.trim() : "",
    },
    uploadedImages: {
      happy:
        typeof uploadedImages.happy === "string" ? uploadedImages.happy.trim() : "",
      pensive:
        typeof uploadedImages.pensive === "string" ? uploadedImages.pensive.trim() : "",
      reject:
        typeof uploadedImages.reject === "string" ? uploadedImages.reject.trim() : "",
    },
  };
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isValidImageDataUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\n\r]+$/.test(value);
}

export function isValidRedirectImageUrl(value: string): boolean {
  return isValidHttpUrl(value) || isValidImageDataUrl(value);
}

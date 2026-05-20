export type ChatRole = "user" | "agent";

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  supplierCards?: SupplierMatch[];
}

/**
 * Mirrors the JSON shape returned by `backend/app/db.py::_serialize`.
 * snake_case kept on purpose so we can pass the API response through
 * without transformation.
 *
 * Note: the source listing URL is intentionally NOT in this type — the
 * backend strips it from the response so buyers can't bypass our local
 * coordination team and contact suppliers directly.
 */
export interface SupplierMatch {
  id: string;
  source?: string;
  name: string;
  category?: string | null;
  description?: string | null;
  specs: Record<string, string>;
  price_usd?: number | null;
  price_currency?: string | null;
  price_hidden?: boolean;
  image_url?: string | null;
  all_image_urls?: string[];
  supplier: {
    name?: string | null;
    location?: string | null;
    rating?: number | null;
    review_count?: number | null;
    is_verified?: boolean;
    is_trustseal?: boolean;
    is_manufacturer?: boolean;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
}

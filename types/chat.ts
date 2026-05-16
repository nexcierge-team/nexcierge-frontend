export type ChatRole = "user" | "agent";

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  supplierCards?: SupplierMatch[];
}

export interface SupplierMatch {
  id: string;
  title: string;
  imageUrl?: string;
  specs: { label: string; value: string }[];
  priceRangeUsd: [number, number];
  moq: number;
  leadTimeDays: number;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
}

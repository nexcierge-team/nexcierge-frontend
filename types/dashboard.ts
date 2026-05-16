export type RequestStatus =
  | "Awaiting Specifications"
  | "Supplier Matching"
  | "Quote Ready"
  | "Negotiating"
  | "Production"
  | "Shipped"
  | "Delivered";

export interface SourcingRequest {
  id: string;
  title: string;
  category: string;
  status: RequestStatus;
  updatedAt: string;
  matchedSuppliers: number;
  quoteCount: number;
}

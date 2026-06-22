import { z } from "zod";

// The default template columns, in order. Baseline the AI maps to.
export const DEFAULT_COLUMNS: string[] = [
  "PO Number - Customer Reference",
  "SKU",
  "QTY",
  "Unit Cost",
  "Delivery Name",
  "Delivery Address 1",
  "Delivery Address 2",
  "Delivery City",
  "Delivery County",
  "Delivery Postcode",
  "Delivery Country",
  "Telephone",
];

// Request body for the generate endpoint.
export const generateRequestSchema = z.object({
  input: z.string().min(1, "Order details are required"),
  instructions: z.string().optional().default(""),
  // The following may override the persisted settings for the session.
  provider: z.enum(["openai", "anthropic", "demo"]).optional(),
  token: z.string().optional(),
  model: z.string().optional(),
  systemContext: z.string().optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

// Shape returned by the LLM and the generate endpoint.
export type ParsedTable = {
  columns: string[];
  rows: Record<string, string | number>[];
};

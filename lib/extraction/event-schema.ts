import { z } from "zod";

export const FoodStatusSchema = z.enum([
  "EXPLICIT",
  "LIKELY",
  "POSSIBLE",
  "NONE",
]);

export const FoodTypeSchema = z.enum([
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "pizza",
  "snacks",
  "dessert",
  "refreshments",
  "drinks",
  "catering",
  "unknown",
]);

export const SourceTypeSchema = z.enum([
  "official_calendar",
  "department",
  "student_org",
  "company_event",
  "pdf",
  "manual",
  "other",
]);

export const ExtractedFoodSchema = z.object({
  status: FoodStatusSchema,
  types: z.array(FoodTypeSchema),
  confidence: z.number().min(0).max(1),
  evidence: z.string().nullable(),
});

export const ExtractedRegistrationSchema = z.object({
  required: z.boolean().nullable(),
  url: z.string().nullable(),
  deadline: z.string().nullable(),
});

/**
 * Strict schema for future LLM extraction. Unknown values must be null.
 * Invalid model output is rejected — never written blindly to the repository.
 */
export const EventExtractionSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  organizer: z.string().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  venueRaw: z.string().nullable(),
  room: z.string().nullable(),
  food: ExtractedFoodSchema,
  registration: ExtractedRegistrationSchema,
  sourceExternalId: z.string().nullable().optional(),
  incomplete: z.boolean().optional(),
  incompleteReasons: z.array(z.string()).optional(),
});

export const EventExtractionListSchema = z.array(EventExtractionSchema);

export type EventExtraction = z.infer<typeof EventExtractionSchema>;

export function parseEventExtractions(input: unknown): {
  ok: true;
  data: EventExtraction[];
} | {
  ok: false;
  error: string;
} {
  const result = EventExtractionListSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, data: result.data };
}

import type { SummaryFields } from "@calcom/emails/src/ticket-v6/summary";
import { z } from "zod";

const line = (max: number) => z.string().trim().max(max);
const point = z.object({ premium: z.boolean(), distinctive: z.boolean() });
const layer = z.object({ settled: z.boolean(), note: line(60) });

export const summaryFieldsSchema = z.object({
  quotes: z.array(line(240)).max(3),
  categoryNoun: line(40).min(1),
  today: point,
  target: point,
  goal: line(60).min(1),
  problem: line(900).min(1),
  stack: z.tuple([layer, layer, layer, layer]),
  riding: z.array(z.object({ title: line(60).min(1), text: line(220).min(1) })).max(3),
  fit: z.object({ yes: z.boolean(), why: line(500).min(1) }),
  nextTitle: line(90).min(1),
  nextBody: line(500).min(1),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.number().int().min(1).max(20),
  bookingLink: z
    .string()
    .url()
    .max(300)
    .refine((u) => /^https?:\/\//i.test(u)),
}) satisfies z.ZodType<SummaryFields>;

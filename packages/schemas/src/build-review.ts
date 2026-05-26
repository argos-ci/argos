import { z } from "zod";

export const BuildReviewEventSchema = z.enum(["APPROVE", "REJECT", "COMMENT"]);
export type BuildReviewEvent = z.infer<typeof BuildReviewEventSchema>;

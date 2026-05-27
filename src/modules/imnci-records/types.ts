import type { z } from "zod";

import type {
  imnciRecordUpsertSchema,
  imnciRecordsListQuerySchema,
} from "./imnci-record.validation";

export type ImnciRecordUpsertInput = z.infer<typeof imnciRecordUpsertSchema>;
export type ImnciRecordListQueryInput = z.infer<
  typeof imnciRecordsListQuerySchema
>;

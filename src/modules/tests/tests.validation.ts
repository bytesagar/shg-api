import { z } from "zod";
import {
  clinicalListFilterShape,
  createListQuerySchema,
} from "../../utils/query-parser";

export const testCategoryFilter = z.enum(["lab", "imaging", "other"]).optional();

export const testsListQuerySchema = createListQuerySchema({
  ...clinicalListFilterShape,
  testCategory: testCategoryFilter,
});

export type TestsListQuery = z.infer<typeof testsListQuerySchema>;

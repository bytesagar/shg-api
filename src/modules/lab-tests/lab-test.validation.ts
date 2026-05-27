import { z } from "zod";

import {
    createListQuerySchema,
    optionalQueryString,
} from "../../utils/query-parser";

const optionalCategoryQuery = z.preprocess((v) => {
    if (typeof v === "string" && v.trim().length > 0) {
        return v.trim().toUpperCase();
    }
    return undefined;
}, z.string().optional());

export const labTestsListQuerySchema = createListQuerySchema({
    q: optionalQueryString,
    category: optionalCategoryQuery,
});

export type LabTestsListQuery = z.infer<typeof labTestsListQuerySchema>;

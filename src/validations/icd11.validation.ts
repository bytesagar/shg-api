import { z } from "zod";
import { icd11CodesListQuerySchema } from "../utils/query-parser";

export type Icd11CodesListQuery = z.infer<typeof icd11CodesListQuerySchema>;

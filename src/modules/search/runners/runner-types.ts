import type { Classification, RunnerResult, SearchHit } from "../types";
import type { SearchScope } from "../search.scope";

export type SearchRunner<THit extends SearchHit = SearchHit> = (args: {
  scope: SearchScope;
  q: string;
  classification: Classification;
  limit: number;
}) => Promise<RunnerResult<THit>>;

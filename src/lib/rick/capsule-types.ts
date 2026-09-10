import type { AgendaEvent, Doc, Domain, FocusState, ForgetBackup, RickMessage } from "@/lib/rick/types";

export type RickStateExport = {
  schema: 1;
  build: string;
  at: number;
  identity: string;
  domains: Domain[];
  activeDomainId: string;
  docs: Doc[];
  messages: RickMessage[];
  events: AgendaEvent[];
  summaries: Record<string, string>;
  summaryCursors: Record<string, string>;
  focus: FocusState | null;
  driftBlocked: boolean;
  driftReason: string;
  motorRef: string;
  motorLast: string;
  motorBlocked: boolean;
  backups: ForgetBackup[];
  fingerprint: string;
};

export interface RumorLedgerEntry {
  id: string;
  householdId: string;
  /** Dedup key: source npc + target npc + fact. */
  propagationKey: string;
  sourceNpcId: string;
  targetNpcId: string;
  factId: string;
  createdAt: Date;
}

export interface RumorLedgerPort {
  /** Records a propagation; no-ops if the key already exists. */
  recordPropagation(entry: RumorLedgerEntry): Promise<void>;
  /** Returns true if the same rumor was already propagated to the same target. */
  hasPropagated(
    householdId: string,
    sourceNpcId: string,
    targetNpcId: string,
    factId: string,
  ): Promise<boolean>;
  /** Lists all propagation records for a household. */
  listPropagations(
    householdId: string,
  ): Promise<RumorLedgerEntry[]>;
}
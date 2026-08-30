export const CANONICAL_GRIP_CONSTRUCTION_COMPETENCE_ID="competence:B3" as const;

const historicalGripCompetenceIds=new Set(["competence:B1","competence:B2"]);

export function normalizeHistoricalGripCompetenceId(competenceId:string):string {
  return historicalGripCompetenceIds.has(competenceId)
    ?CANONICAL_GRIP_CONSTRUCTION_COMPETENCE_ID:competenceId;
}

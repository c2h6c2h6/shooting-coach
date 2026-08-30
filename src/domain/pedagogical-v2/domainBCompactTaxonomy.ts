import type { MasteryLevel } from "./contracts";

export const domainBCompactTaxonomy={
  fundamentalCompetences:[
    {businessCode:"B1",technicalCompetenceId:"competence:B3",label:"Construire une prise fonctionnelle"},
    {businessCode:"B2",technicalCompetenceId:"competence:B4",label:"Coordonner la contribution des deux mains"},
    {businessCode:"B3",technicalCompetenceId:"competence:B6",label:"Organiser et stabiliser les poignets"},
  ],
} as const;

export interface HistoricalDomainBCompetenceNormalization {
  readonly canonicalCompetenceId:string;
  readonly masteryIntents:readonly MasteryLevel[];
  readonly deprecated:boolean;
}

export function normalizeHistoricalDomainBCompetence(competenceId:string):HistoricalDomainBCompetenceNormalization {
  if(competenceId==="competence:B7") return {
    canonicalCompetenceId:"competence:B3",masteryIntents:["stabilization","robustness"],deprecated:true,
  };
  if(competenceId==="competence:B8") return {
    canonicalCompetenceId:"competence:B3",masteryIntents:["transfer","robustness"],deprecated:true,
  };
  return {canonicalCompetenceId:competenceId,masteryIntents:[],deprecated:false};
}

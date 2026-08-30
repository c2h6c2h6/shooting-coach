import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { coachingRecommendationCatalog } from "./coachingRecommendationCatalog";
import { trainingDrillCatalog } from "./trainingDrillCatalog";

export const prohibitedCategoricalPatterns=[
 /votre erreur est/i,/vous anticipez/i,/vous mettez trop de doigt/i,/nous avons identifié la cause/i,
 /cet exercice corrigera/i,/résultat garanti/i,/cause définitivement confirmée/i,/problème est réglé/i,
 /devez absolument/i,/garantit un meilleur résultat/i,/\b\d{1,3}\s*%\s*(de probabilité|certain)/i,
];
export function auditPrudentText(value:unknown){
 const text=JSON.stringify(value);return prohibitedCategoricalPatterns.flatMap(pattern=>pattern.test(text)?[pattern.source]:[]);
}
export function auditCatalogPrudence(){return auditPrudentText([confirmationTestCatalog,coachingRecommendationCatalog,trainingDrillCatalog])}
export function auditCatalogSafety(){
 const errors:string[]=[];
 for(const item of [...confirmationTestCatalog,...trainingDrillCatalog]){
  if(item.requiresDryFire&&!item.safetyRequirements.some(x=>/chambre/i.test(x)))errors.push(`${item.code}: vérification de chambre absente`);
  if(item.requiresLiveFire&&!item.safetyRequirements.some(x=>/stand/i.test(x)))errors.push(`${item.code}: stand autorisé absent`);
  const allText=item.safetyRequirements.concat("prerequisites" in item?item.prerequisites:[],"instructions" in item?item.instructions:[],"preparation" in item?item.preparation:[]);
  if(item.requiresInstructor&&!allText.some(x=>/instructeur|supervis/i.test(x)))errors.push(`${item.code}: supervision absente`);
 }
 const text=JSON.stringify([confirmationTestCatalog,coachingRecommendationCatalog,trainingDrillCatalog]).toLowerCase();
 for(const forbidden of ["tir opérationnel","neutralisation","dégainé","dissimulation","modifier vous-même"]){
  if(text.includes(forbidden))errors.push(`Contenu interdit: ${forbidden}`);
 }
 return errors;
}

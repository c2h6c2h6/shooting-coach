import { ConfirmationTestDefinition, SafetyContext, TrainingDrill } from "./coachingTypes";

export const DRY_FIRE_SAFETY = [
  "Arme totalement déchargée et chargeur retiré.",
  "Chambre vérifiée visuellement et physiquement.",
  "Aucune munition réelle dans la zone de manipulation.",
  "Direction sûre et respect des règles du fabricant et du stand.",
];
export const LIVE_FIRE_SAFETY = [
  "Uniquement dans un stand autorisé et selon son règlement.",
  "Protections auditives et oculaires obligatoires.",
  "Arrêt immédiat en cas d’incident, de doute ou de comportement anormal de l’arme.",
];
export const COMMON_STOP_CONDITIONS = [
  "Fatigue, douleur, stress ou inconfort.",
  "Perte de concentration ou difficulté à comprendre la consigne.",
  "Non-respect d’une règle de sécurité ou incident de tir.",
  "Forte augmentation de la dispersion.",
  "Nombre maximal de séries atteint.",
];
export function safetyBlockers(item:Pick<ConfirmationTestDefinition|TrainingDrill,
 "requiresLiveFire"|"requiresDryFire"|"requiresDummyRounds"|"requiresInstructor">,c:SafetyContext):string[]{
  const b:string[]=[];
  if(!c.rangeRulesAccepted)b.push("Règles du stand non confirmées.");
  if(!c.safeDirectionAvailable)b.push("Direction sûre non confirmée.");
  if(item.requiresDryFire&&(!c.canDryFire||!c.weaponUnloadedVerified||!c.magazineRemoved||
    !c.chamberVisualPhysicalCheck||!c.liveAmmunitionRemovedFromArea))b.push("Prérequis complets du travail à sec non confirmés.");
  if(item.requiresLiveFire&&(!c.canLiveFire||!c.inAuthorizedRange||!c.eyeAndEarProtection))
    b.push("Prérequis complets du tir réel non confirmés.");
  if(item.requiresDummyRounds&&(!c.dummyRoundsAllowed||!c.dummyRoundProcedureKnown))
    b.push("Munition inerte non autorisée ou procédure non maîtrisée.");
  if(item.requiresInstructor&&!c.instructorPresent)b.push("Instructeur requis mais absent.");
  return b;
}


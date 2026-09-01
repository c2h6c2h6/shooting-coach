import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { safetyBlockers } from "./coachingSafetyRules";
import { ConfirmationTestDefinition, SafetyContext } from "./coachingTypes";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { confirmCoordinatedSafety,confirmSessionSafety,confirmSpecificSafety,DRY_FIRE_VALIDATION_KEYS,EMPTY_SAFETY_CONTEXT,inheritedSafetyKeys,
 invalidateDryFireConfiguration,isDryFireConfigurationValidated,isSessionSafetyConfirmed,SESSION_SAFETY_KEYS,specificSafetyKeys } from "./sessionSafetyContext";

const inherited:SafetyContext={...EMPTY_SAFETY_CONTEXT,rangeRulesAccepted:true,safeDirectionAvailable:true,
 inAuthorizedRange:true,eyeAndEarProtection:true,canLiveFire:true,canDryFire:true};
const test=(overrides:Partial<ConfirmationTestDefinition>)=>({
 requiresDryFire:false,requiresLiveFire:false,requiresDummyRounds:false,requiresInstructor:false,...overrides,
}) as ConfirmationTestDefinition;

describe("contexte de sécurité de séance",()=>{
 it("confirme globalement les conditions générales sans valider un état d’arme spécifique",()=>{
  const confirmed=confirmSessionSafety(EMPTY_SAFETY_CONTEXT);
  expect(SESSION_SAFETY_KEYS.every(key=>confirmed[key])).toBe(true);
  expect(confirmed).toMatchObject({weaponUnloadedVerified:false,magazineRemoved:false,
   chamberVisualPhysicalCheck:false,liveAmmunitionRemovedFromArea:false,
   instructorPresent:false,dummyRoundsAllowed:false,dummyRoundProcedureKnown:false});
  expect(isSessionSafetyConfirmed(confirmed)).toBe(true);
 });
 it("redemande le contexte pour une nouvelle séance vide",()=>{
  expect(isSessionSafetyConfirmed(EMPTY_SAFETY_CONTEXT)).toBe(false);
  expect(isSessionSafetyConfirmed(null)).toBe(false);
 });
 it("hérite du même contexte général entre deux tests sans y persister l’état ponctuel de l’arme",()=>{
  const sessionContext=confirmSessionSafety(EMPTY_SAFETY_CONTEXT);
  const dryKeys=specificSafetyKeys(test({requiresDryFire:true}),sessionContext);
  const dryTestContext=confirmSpecificSafety(sessionContext,dryKeys);
  expect(isSessionSafetyConfirmed(sessionContext)).toBe(true);
  expect(sessionContext.weaponUnloadedVerified).toBe(false);
  expect(dryTestContext.weaponUnloadedVerified).toBe(true);
  expect(specificSafetyKeys(test({requiresLiveFire:true}),sessionContext)).toEqual([]);
 });
 it("réutilise les conditions générales validées",()=>{
  expect(inheritedSafetyKeys(test({requiresLiveFire:true}))).toEqual([
   "rangeRulesAccepted","safeDirectionAvailable","inAuthorizedRange","eyeAndEarProtection","canLiveFire",
  ]);
  expect(safetyBlockers(test({requiresLiveFire:true}),inherited)).toEqual([]);
 });
 it("un test à sec ne redemande que les quatre contrôles critiques",()=>{
  const keys=specificSafetyKeys(test({requiresDryFire:true}),inherited);
  expect(keys).toEqual([
   "weaponUnloadedVerified","magazineRemoved","chamberVisualPhysicalCheck","liveAmmunitionRemovedFromArea",
  ]);
  expect(keys).not.toContain("canLiveFire");expect(keys).not.toContain("eyeAndEarProtection");
  expect(safetyBlockers(test({requiresDryFire:true}),inherited)).toContain("Prérequis complets du travail à sec non confirmés.");
  expect(safetyBlockers(test({requiresDryFire:true}),confirmSpecificSafety(inherited,keys))).toEqual([]);
 });
 it("un test réel ne demande aucun contrôle propre au travail à sec",()=>{
  expect(specificSafetyKeys(test({requiresLiveFire:true}),inherited)).toEqual([]);
 });
 it("ajoute uniquement les besoins inertes ou instructeur",()=>{
  expect(specificSafetyKeys(test({requiresDummyRounds:true,requiresInstructor:true}),inherited)).toEqual([
   "dummyRoundsAllowed","dummyRoundProcedureKnown","instructorPresent",
  ]);
 });
 it("conserve toutes les exigences du test réel avec alternance inerte supervisée",()=>{
  const dummyTest=confirmationTestCatalog.find(x=>x.code==="TEST_DUMMY_ROUND_SUPERVISED");
  expect(dummyTest).toBeDefined();
  expect(dummyTest).toMatchObject({requiresLiveFire:true,requiresDummyRounds:true,requiresInstructor:true});
  expect(specificSafetyKeys(dummyTest!,inherited)).toEqual([
   "dummyRoundsAllowed","dummyRoundProcedureKnown","instructorPresent",
  ]);
  expect(safetyBlockers(dummyTest!,inherited)).toEqual([
   "Munition inerte non autorisée ou procédure non maîtrisée.","Instructeur requis mais absent.",
  ]);
  expect(safetyBlockers(dummyTest!,{...inherited,dummyRoundsAllowed:true,dummyRoundProcedureKnown:true,instructorPresent:true})).toEqual([]);
 });
 it("coordonne une première confirmation générale et à sec sans auto-confirmer instructeur ou munitions inertes",()=>{
  const coordinated=confirmCoordinatedSafety(EMPTY_SAFETY_CONTEXT,
   test({requiresDryFire:true,requiresDummyRounds:true,requiresInstructor:true}),true);
  expect(isSessionSafetyConfirmed(coordinated.sessionConditions)).toBe(true);
  expect(coordinated.confirmedTestKeys).toEqual([
   "weaponUnloadedVerified","magazineRemoved","chamberVisualPhysicalCheck","liveAmmunitionRemovedFromArea",
  ]);
  expect(coordinated.testConditions).toMatchObject({weaponUnloadedVerified:true,magazineRemoved:true,
   chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,
   dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false});
 });
 it("ne redemande pas le contexte général et ne confirme que le nouveau prérequis à sec",()=>{
  const coordinated=confirmCoordinatedSafety(inherited,test({requiresDryFire:true}),false);
  expect(coordinated.sessionConditions).toEqual(inherited);
  expect(coordinated.confirmedTestKeys).toHaveLength(4);
  expect(coordinated.testConditions.weaponUnloadedVerified).toBe(true);
 });
 it("réutilise la première validation à sec pour les deuxième et troisième tests",()=>{
  const validated=confirmSpecificSafety(inherited,specificSafetyKeys(test({requiresDryFire:true}),inherited));
  expect(isDryFireConfigurationValidated(validated)).toBe(true);
  expect(specificSafetyKeys(test({requiresDryFire:true}),validated).filter(key=>!validated[key])).toEqual([]);
  expect(specificSafetyKeys(test({requiresDryFire:true}),validated).filter(key=>!validated[key])).toEqual([]);
 });
 it("invalide la validation à sec avant une reprise live et impose une nouvelle transition live vers dry",()=>{
  const validated=confirmSpecificSafety(inherited,specificSafetyKeys(test({requiresDryFire:true}),inherited));
  const afterLive=invalidateDryFireConfiguration(validated);
  expect(isDryFireConfigurationValidated(afterLive)).toBe(false);
  expect(DRY_FIRE_VALIDATION_KEYS.filter(key=>!afterLive[key])).toEqual(DRY_FIRE_VALIDATION_KEYS);
  expect(safetyBlockers(test({requiresDryFire:true}),afterLive)).toContain("Prérequis complets du travail à sec non confirmés.");
 });
});

describe("présentation sécurité globale",()=>{
 const screen=readFileSync(resolve(process.cwd(),"app/sessions/[id]/series/[seriesId]/coaching.tsx"),"utf8");
 it("remplace les cases générales par une seule confirmation coordonnée",()=>{
  expect(screen).toContain("<Text style={styles.section}>Sécurité</Text>");
  expect(screen).not.toContain("SESSION_SAFETY_KEYS.map(toggle)");
  expect(screen).not.toContain('safety[k]?"☑":"☐"');
 });
 it("regroupe les quatre vérifications à sec sous une seule confirmation",()=>{
  expect(screen).toContain("Je confirme que les conditions de sécurité nécessaires à ce test sont réunies");
  expect(screen).toContain("requiredSafetyKeys.map(k=><Text");
  expect(screen).toContain("confirmCoordinatedSafety");
 });
 it("permet au test réel sans condition supplémentaire de commencer directement",()=>{
  expect(screen).toContain("blockers.length===0");
  expect(screen).toContain("Commencer le test");
 });
 it("présente la sécurité avant le contenu du test et compacte le contexte hérité",()=>{
  expect(screen.indexOf("{safetyCard}")).toBeLessThan(screen.indexOf('<Text style={styles.section}>Test</Text>'));
  expect(screen).toContain("Conditions générales de sécurité déjà validées.");
  expect(screen).toContain("Voir les consignes");
 });
 it("compacte une configuration à sec réutilisée et annonce une reprise restaurée",()=>{
  expect(screen).toContain("Conditions à sec déjà validées.");
  expect(screen).toContain("REPRISE DU TEST EN COURS");
  expect(screen).toContain("setRestoredTest(true)");
  expect(screen).not.toContain("const previewTest");
 });
});

import { ConfirmationTestDefinition, SafetyContext } from "./coachingTypes";

export const EMPTY_SAFETY_CONTEXT: SafetyContext = {
  inAuthorizedRange:false, rangeRulesAccepted:false, safeDirectionAvailable:false,
  weaponUnloadedVerified:false, magazineRemoved:false, chamberVisualPhysicalCheck:false,
  liveAmmunitionRemovedFromArea:false, eyeAndEarProtection:false, dummyRoundsAllowed:false,
  dummyRoundProcedureKnown:false, instructorPresent:false, canDryFire:false, canLiveFire:false,
};

export const SESSION_SAFETY_KEYS: Array<keyof SafetyContext> = [
  "rangeRulesAccepted", "safeDirectionAvailable", "inAuthorizedRange", "eyeAndEarProtection",
  "canLiveFire", "canDryFire",
];

export const USER_CONFIRMABLE_TEST_SAFETY_KEYS: Array<keyof SafetyContext> = [
  "weaponUnloadedVerified", "magazineRemoved", "chamberVisualPhysicalCheck",
  "liveAmmunitionRemovedFromArea",
];
export const DRY_FIRE_VALIDATION_KEYS: Array<keyof SafetyContext> = [
 "weaponUnloadedVerified","magazineRemoved","chamberVisualPhysicalCheck","liveAmmunitionRemovedFromArea",
];

export function isDryFireConfigurationValidated(context:SafetyContext):boolean {
 return context.canDryFire&&DRY_FIRE_VALIDATION_KEYS.every(key=>context[key]);
}

export function invalidateDryFireConfiguration(context:SafetyContext):SafetyContext {
 return DRY_FIRE_VALIDATION_KEYS.reduce<SafetyContext>((next,key)=>({...next,[key]:false}),{...context});
}

export function confirmSessionSafety(current: SafetyContext): SafetyContext {
  return SESSION_SAFETY_KEYS.reduce<SafetyContext>(
    (next, key) => ({ ...next, [key]: true }), { ...current },
  );
}

export function isSessionSafetyConfirmed(context: SafetyContext | null): boolean {
  return context !== null && SESSION_SAFETY_KEYS.every((key) => context[key]);
}

export function confirmSpecificSafety(
  current: SafetyContext,
  keys: readonly (keyof SafetyContext)[],
): SafetyContext {
  return keys.reduce<SafetyContext>((next, key) => ({ ...next, [key]: true }), { ...current });
}

export function confirmCoordinatedSafety(
  current: SafetyContext,
  test: Pick<ConfirmationTestDefinition,"requiresDryFire"|"requiresLiveFire"|"requiresDummyRounds"|"requiresInstructor">,
  includeSessionSafety: boolean,
): { sessionConditions: SafetyContext; testConditions: SafetyContext; confirmedTestKeys: Array<keyof SafetyContext> } {
  const sessionConditions = includeSessionSafety ? confirmSessionSafety(current) : { ...current };
  const confirmedTestKeys = specificSafetyKeys(test, sessionConditions)
    .filter((key) => USER_CONFIRMABLE_TEST_SAFETY_KEYS.includes(key));
  return {
    sessionConditions,
    testConditions: confirmSpecificSafety(sessionConditions, confirmedTestKeys),
    confirmedTestKeys,
  };
}

export function specificSafetyKeys(
  test: Pick<ConfirmationTestDefinition,"requiresDryFire"|"requiresLiveFire"|"requiresDummyRounds"|"requiresInstructor">,
  inherited: SafetyContext,
): Array<keyof SafetyContext> {
  const keys:Array<keyof SafetyContext> = [];
  if (test.requiresDryFire) {
    keys.push("weaponUnloadedVerified","magazineRemoved","chamberVisualPhysicalCheck","liveAmmunitionRemovedFromArea");
  }
  if (test.requiresDummyRounds && !inherited.dummyRoundsAllowed) keys.push("dummyRoundsAllowed");
  if (test.requiresDummyRounds) keys.push("dummyRoundProcedureKnown");
  if (test.requiresInstructor && !inherited.instructorPresent) keys.push("instructorPresent");
  return [...new Set(keys)];
}

export function inheritedSafetyKeys(
  test: Pick<ConfirmationTestDefinition,"requiresDryFire"|"requiresLiveFire"|"requiresDummyRounds"|"requiresInstructor">,
): Array<keyof SafetyContext> {
  const keys:Array<keyof SafetyContext> = ["rangeRulesAccepted","safeDirectionAvailable"];
  if (test.requiresDryFire) keys.push("canDryFire");
  if (test.requiresLiveFire) keys.push("inAuthorizedRange","eyeAndEarProtection","canLiveFire");
  if (test.requiresDummyRounds) keys.push("dummyRoundsAllowed");
  if (test.requiresInstructor) keys.push("instructorPresent");
  return [...new Set(keys)];
}

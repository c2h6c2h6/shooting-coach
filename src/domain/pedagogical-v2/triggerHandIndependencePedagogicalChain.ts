import type {ConfirmationOutcome} from "../coachingTypes";
import {d2TriggerHandTechnicalControl} from "../technicalObservationControl";

export const triggerHandIndependencePedagogicalChain={
  hypothesisCode:"TRIGGER_FINGER_HAND_COACTIVATION",
  confirmationTestCode:"TEST_TRIGGER_HAND_INDEPENDENCE",
  competenceId:"competence-d2",
  diagnosticTestId:"diagnostic-test-d2-index-hand-independence-01",
  pedagogicalTechniqueId:"technique-d2-index-hand-independence-01",
  exerciseDefinitionId:"exercise-d2-index-hand-independence-01",
  control:d2TriggerHandTechnicalControl,
} as const;

export function triggerHandIndependenceInterventionForOutcome(outcome:ConfirmationOutcome){
  return outcome==="supports_hypothesis"||outcome==="weakly_supports_hypothesis"
    ?triggerHandIndependencePedagogicalChain:null;
}

# TEST-D4-01 — Observation ralentie de l’action

## Identité et version

- ID : `diagnostic-test-d4-01`
- code : `TEST-D4-01`
- nom : Observation ralentie de l’action
- `schemaVersion` : `pedagogical-v2-inputs-v1`
- `itemVersion` : `1.0.0`
- `catalogVersion` : `pedagogical-reference-d-v1`
- statut : contenu métier réel v2, fonctionnellement inactif

## Incertitude testée

- code : `UNCERTAINTY_D4_PROGRESSIVITY_INSUFFICIENT`
- signification : Incertitude sur le fait qu’une perturbation observée soit compatible avec une progressivité insuffisante de l’action sur la détente relevant de D4.

Ce code représente une incertitude. Il ne représente ni une cause confirmée, ni une compétence insuffisante confirmée, ni un diagnostic, ni une `TechnicalHypothesis` v1.

## Objectif diagnostique

L’augmentation de pression reste-t-elle progressive lorsque l’action est volontairement ralentie afin de rendre son organisation observable ?

## Principe

Le ralentissement sert uniquement à augmenter la lisibilité du geste. Il n’est ni la compétence ni la finalité.

Ce principe reste documentaire car `DiagnosticTestDefinition` ne possède pas de champ naturel dédié.

## Compétence observée

- `observedCompetenceId` : `competence-d4`

D4 est observée. Cela ne signifie jamais que D4 est automatiquement considérée insuffisante.

## Prérequis

- `prerequisiteReferenceIds` : `["competence-d3"]`

D3 constitue le prérequis direct de D4. Le test cherche à observer la progressivité de l’action D4. Une continuité suffisante de l’action est nécessaire pour rendre cette progressivité interprétable.

## Conditions d’utilisation

1. Action volontairement ralentie.
2. Objectif exclusif : rendre l’organisation de la pression plus observable.
3. Conditions permettant une observation directe par l’instructeur.
4. Aucune contrainte temporelle ajoutée.

## Limites d’interprétation

- Une action progressive pendant le test n’exclut pas qu’une perturbation apparaisse dans d’autres conditions.
- Une action non progressive pendant le test renforce l’hypothèse D4 insuffisante mais ne permet pas d’exclure l’intervention concomitante d’un autre mécanisme.
- Une perturbation de l’arme ne suffit pas à attribuer le défaut à D4.
- La position des impacts en cible ne permet pas, à elle seule, d’interpréter le résultat de ce test.

## Résultats possibles

Le contrat `DiagnosticTestResult` existant conserve uniquement :

- `usable` ;
- `non_discriminating` ;
- `inconclusive`.

Pour un résultat `usable`, l’evidence pourra ultérieurement renforcer ou affaiblir `UNCERTAINTY_D4_PROGRESSIVITY_INSUFFICIENT`. Le test ne sélectionne ni exercice, ni technique, ni décision pédagogique, ni niveau de maîtrise.

## Critères d’arrêt

1. Impossibilité d’observer l’action de manière suffisamment fiable.
2. Conditions ne permettant plus d’isoler raisonnablement l’observation recherchée.
3. Interruption demandée par l’instructeur.

## Validation et supervision

- mode : `instructor`
- supervision instructeur requise
- aucune validation automatique

## Éléments explicitement hors périmètre

- deuxième `DiagnosticTest` D4 ;
- test du départ attendu non produit ;
- douille en équilibre ;
- déclenchement automatique vers `TECH-D4-01` et toute autre `PedagogicalTechnique` réelle ;
- `EX-D4-01` ou autre `ExerciseDefinition` réel ;
- D1, D2, D5, D6 ou E1 ;
- `TechnicalHypothesis` réelle ;
- `CompetenceEvaluation`, `PedagogicalDecision`, `MasteryEvent` ou `ShooterSelfReport` réel ;
- contexte métier réel ;
- persistance, migration, interface ou activation du moteur v2.

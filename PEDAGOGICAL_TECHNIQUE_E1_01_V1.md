# TECH-E1-01 — Acceptation du départ

## Identité et version

- ID : `technique-e1-01`
- code : `TECH-E1-01`
- nom : Acceptation du départ
- `schemaVersion` : `pedagogical-v2-contracts-v1`
- `itemVersion` : `1.0.0`
- `catalogVersion` : `pedagogical-reference-e-v1`
- statut : contenu métier réel v2, fonctionnellement inactif

## Principe

Amener le tireur à poursuivre son action sans chercher à provoquer, accompagner ou éviter l’instant du départ, afin que le coup puisse survenir sans réponse motrice anticipatrice.

## Doctrine

La finalité n’est pas de demander au tireur de rester immobile. La finalité est qu’il ne produise pas de réponse motrice anticipatrice à l’instant attendu du départ.

Cette doctrine reste documentaire car `PedagogicalTechnique` ne possède pas de champ naturel dédié.

## Indications

1. Réponse motrice observée avant le recul ou malgré l’absence de départ réel.
2. Tendance du tireur à chercher à provoquer ou contrôler volontairement l’instant exact du départ.
3. Organisation qui se dégrade à l’approche du départ alors que l’action précédente reste acceptable.
4. Besoin de faire ressentir la différence entre laisser survenir le départ et y répondre par anticipation.

## Contre-indications

1. Lorsque la chronologie du mouvement observé ne permet pas de distinguer une réponse anticipatrice d’un mouvement consécutif au recul.
2. Lorsque l’incertitude principale concerne une autre compétence et qu’E1 n’est pas suffisamment étayée.
3. Lorsque la consigne conduit le tireur à interrompre ou dégrader volontairement son action dans le seul but de ne pas anticiper.
4. Lorsque la poursuite de la technique n’apporte plus d’information ou d’apprentissage utile.

## Compétence compatible

- `compatibleCompetenceIds` : `["competence-e1"]`

Aucune autre compétence n’est déclarée compatible dans cette version.

## Supervision

- `instructorRequired` : `true`

## Outils compatibles

- `compatiblePedagogicalToolIds` : `[]`

Aucun outil n’est obligatoire. `TEST-E1-01` n’est pas un `PedagogicalTool`.

## Distinction avec TEST-E1-01

`TEST-E1-01` réduit l’incertitude `UNCERTAINTY_E1_ANTICIPATORY_RESPONSE` en produisant de l’information et des evidence.

`TECH-E1-01` est une manière d’intervenir pédagogiquement sur E1.

Aucun déclenchement automatique `TEST-E1-01 → TECH-E1-01` n’est créé.

## Absence d’exercice

TECH-E1-01 n’est pas un `ExerciseDefinition`. Aucun exercice E1, protocole d’exercice, variable pédagogique E1 ou critère de réussite d’exercice n’est défini.

## Absence de maîtrise automatique

TECH-E1-01 ne produit directement ni validation E1, ni `CompetenceEvaluation`, ni `MasteryEvent`, ni changement de `MasteryLevel`.

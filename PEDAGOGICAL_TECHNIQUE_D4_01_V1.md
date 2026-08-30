# TECH-D4-01 — Ralentissement volontaire

## Identité et version

- ID : `technique-d4-01`
- code : `TECH-D4-01`
- nom : Ralentissement volontaire
- `schemaVersion` : `pedagogical-v2-contracts-v1`
- `itemVersion` : `1.0.0`
- `catalogVersion` : `pedagogical-reference-d-v1`
- statut : contenu métier réel v2, fonctionnellement inactif

## Principe

Faire exécuter volontairement l’action sur la détente à une vitesse suffisamment réduite pour permettre au tireur de percevoir et à l’instructeur d’observer l’organisation de la montée en pression, notamment une éventuelle accélération terminale. Une fois l’action progressive acquise, la durée peut être réduite progressivement sans modifier la qualité recherchée.

## Doctrine

Le ralentissement est un moyen pédagogique, pas la compétence. Progressif ne signifie pas lent.

L’objectif final n’est pas d’obtenir une action lente.

Le ralentissement est temporairement utilisé pour rendre l’organisation de l’action plus perceptible et observable.

Cette doctrine reste documentaire car `PedagogicalTechnique` ne possède pas de champ naturel dédié.

## Indications

1. Difficulté du tireur à percevoir la manière dont sa pression évolue jusqu’au départ.
2. Accélération terminale observée ou suspectée.
3. Besoin de rendre l’action suffisamment lisible pour permettre un retour instructeur.
4. Besoin de faire ressentir la différence entre vitesse de l’action et progressivité de l’action.

## Conditions de non-utilisation

1. Lorsque ralentir l’action ne répond pas à l’incertitude ou à l’objectif pédagogique travaillé.
2. Lorsque le ralentissement provoque une modification telle de l’action qu’elle n’est plus interprétable.
3. Lorsque l’élève transforme la consigne en objectif de lenteur.
4. Lorsque l’instructeur dispose déjà d’éléments suffisants et que la poursuite de la technique n’apporte plus d’information ou d’apprentissage utile.

## Compétence concernée dans le pilote

- `compatibleCompetenceIds` : `["competence-d4"]`

La technique reste structurellement mutualisable. Cette version du pilote ne déclare que son utilisation autoritative avec D4.

## Prérequis de cette utilisation

- `competence-d3`

Le contrat `PedagogicalTechnique` ne possède pas de champ de prérequis. Cette information reste donc documentaire et aucun champ supplémentaire n’est créé.

## Outils compatibles

- `compatiblePedagogicalToolIds` : `[]`

Aucun outil n’est obligatoire. `OBSERVATION_VIDEO` n’est pas imposé. `INSTRUCTOR_TACTILE_FEEDBACK` n’est pas associé à TECH-D4-01.

## Supervision

- `instructorRequired` : `true`

TECH-D4-01 v1 est supervisée par l’instructeur. Cela ne crée aucune règle générale interdisant une future pratique autonome.

## Limites d’interprétation

1. Une amélioration lors du ralentissement ne démontre pas à elle seule que D4 était l’unique mécanisme en cause.
2. Une action correcte à vitesse ralentie ne démontre pas qu’elle restera correcte lorsque la durée sera réduite.
3. Une action lente n’est pas nécessairement progressive.
4. La technique ne doit pas installer la lenteur comme critère de réussite.

Ces limites restent documentaires car `PedagogicalTechnique` ne possède pas de champ naturel dédié.

## Distinction avec TEST-D4-01

`TEST-D4-01` utilise le ralentissement pour augmenter la capacité de discrimination d’une incertitude.

`TECH-D4-01` utilise le ralentissement comme moyen pédagogique pour faire percevoir et construire une organisation progressive de l’action.

`DiagnosticTestDefinition` et `PedagogicalTechnique` restent deux objets distincts. Aucun déclenchement automatique `TEST-D4-01 → TECH-D4-01` n’est créé.

## Sorties explicitement interdites

TECH-D4-01 ne produit directement ni validation D4, ni `CompetenceEvaluation`, ni `PedagogicalDecision`, ni `MasteryEvent`, ni `MasteryLevel`, ni `ExerciseDefinition`, ni sélection d’exercice.

## Éléments hors périmètre

- Guidage tactile de l’index comme technique ;
- deuxième technique D4 ;
- `EX-D4-01` ou autre `ExerciseDefinition` réel ;
- deuxième `DiagnosticTest` ;
- test du départ attendu non produit ;
- douille en équilibre ;
- D1, D2, D5, D6 ou E1 ;
- moteur de sélection ;
- persistance, migration, interface ou activation du moteur v2.

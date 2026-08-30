# Contrats pédagogiques v2 — Étape 1

## Périmètre

Cette étape introduit exclusivement un domaine TypeScript générique et autonome destiné au futur référentiel pédagogique v2. Il n'est importé par aucun écran, service, dépôt SQLite, moteur ou export actif. Il ne contient aucun catalogue, aucune compétence A–J, aucun exercice et aucune relation métier réelle.

La baseline v1 reste donc la seule logique exécutée par le produit. Les scénarios A–L, y compris leurs écarts historiques connus E, H, I et J, ne sont ni modifiés ni réinterprétés.

## Localisation et dépendances

Le domaine se trouve dans `src/domain/pedagogical-v2/` :

- `contracts.ts` : types immuables, énumérations fermées et fonctions pures ;
- `schemas.ts` : validation d'entrées `unknown`, sans bibliothèque ni dépendance applicative ;
- `index.ts` : point d'export public du domaine ;
- trois fichiers de tests unitaires et d'isolement.

Les fichiers de production de ce domaine ne dépendent que les uns des autres. Ils ne dépendent pas de React Native, Expo, SQLite, de l'interface ou du moteur pédagogique v1.

## Objets et invariants

### `Competence`

Décrit une fiche versionnée pouvant être chargée ultérieurement depuis un référentiel embarqué. Elle possède un identifiant stable, un code, un domaine, une définition, un objectif, ses identifiants de relations, ses indicateurs, ses limites d'interprétation et son mode de validation.

Pour préserver sans perte les fiches réelles, elle peut également référencer des outils pédagogiques mutualisés, conserver des notes de support non transformées en objets, des composantes internes qui ne sont pas des compétences distinctes et des énoncés de référence validés.

Ses trois niveaux de version sont obligatoires : `schemaVersion`, `itemVersion` et `catalogVersion`.

### `ValidationMode`

Énumération fermée : `automatic`, `semi_automatic`, `instructor`, `future_video`.

La fonction `isCurrentlyAutomaticValidation` ne renvoie `true` que pour `automatic`. Le mode `future_video` n'accorde donc aucune validation automatique actuelle.

### `MasteryLevel`

Énumération fermée : `not_evaluated`, `discovery`, `acquisition`, `stabilization`, `transfer`, `robustness`.

Cette étape ne crée aucun état de maîtrise ni aucune règle de transition entre niveaux.

### `PedagogicalTechnique`

Décrit une technique pédagogique versionnée : principe, compétences compatibles, indications, contre-indications, exigence éventuelle d'un instructeur et outils pédagogiques compatibles. Elle reste distincte de l'exercice.

### `PedagogicalTool`

Décrit un outil pédagogique versionné. Le discriminant constant `kind: "pedagogical_tool"` l'empêche d'être confondu avec le matériel technique. Dans `ExerciseDefinition`, le matériel technique et les outils pédagogiques sont portés par deux champs séparés.

Aucun outil réel n'est créé dans cette étape.

### `ExerciseDefinition`

Décrit l'identité et la structure d'un futur exercice Gold. L'identifiant de compétence principale est un champ scalaire obligatoire : il représente exactement une compétence. Le schéma refuse sa répétition parmi les compétences secondaires.

La technique pédagogique, l'objectif unique, la raison d'existence, les prérequis, le protocole, les consignes, les critères de réussite et d'arrêt, les conditions de non-utilisation, les outils et le matériel sont explicites. Aucun lien vers une hypothèse ou une recommandation n'existe dans ce contrat.

### `PedagogicalVariables`

Regroupe exactement les douze axes validés : distance, nombre de mains, temps, cadence, taille de zone, type de cible, système de visée, nombre de coups, déplacement, charge attentionnelle, complexité et supervision.

Les variables sont des données séparées de l'identité versionnée de l'exercice. La fonction `exerciseIdentity` montre qu'une variation de ces paramètres ne crée pas une nouvelle identité d'exercice. Cette étape ne définit aucune règle L1+ ni aucun ordre de progression.

### `PedagogicalDecisionType`

Énumération fermée : `PROGRESS`, `MAINTAIN`, `SIMPLIFY`, `RETURN_TO_PREREQUISITE`, `TEST_ANOTHER_HYPOTHESIS`, `INSUFFICIENT_INFORMATION`, `STOP`.

Aucun moteur de décision et aucun `PedagogicalDecision` persistant ne sont créés ici.

### `PedagogicalEvidence`

Prépare une preuve structurée et versionnée : sujet, source, valeur, effet, force et fiabilité. Les effets sont limités à `strengthens`, `weakens`, `contradicts` et `neutral`; force et fiabilité sont bornées entre 0 et 1.

Ce contrat n'effectue aucune migration des evidence v1 et n'est branché sur aucune décision active.

## Validation automatisée

Les schémas exposent `safeParse` pour une validation sans exception et `parse` pour un échec explicite. Ils vérifient notamment :

- identifiants et versions obligatoires ;
- énumérations strictement fermées ;
- compétence principale unique et non dupliquée ;
- listes sans doublon ;
- présence des critères de réussite et d'arrêt ;
- variables connues et complètes ;
- distinction entre outil pédagogique et matériel technique ;
- bornes de force et de fiabilité d'une evidence.

Les fixtures de tests utilisent uniquement des identifiants synthétiques `test.*`. Elles ne constituent pas du contenu de référentiel.

## Non-régression v1

Le diff de cette étape est purement additif :

| Zone | Changement |
|---|---|
| `src/domain/pedagogical-v2/` | Six fichiers ajoutés |
| Documentation | Ce fichier ajouté |
| Fichiers v1 existants | Aucun changement |
| SQLite | Aucun changement, aucune migration 13 |
| Interface et navigation | Aucun changement |
| Moteur v1 et scénarios A–L | Aucun changement |
| Export v12 | Aucun changement |

La migration `migrations.ts` conserve exactement la même empreinte SHA-256 que la baseline immuable. Les 296 tests historiques sont exécutés séparément des tests v2 et réussissent sans modification de leurs attentes.

## Décisions de modélisation à confirmer avant les étapes futures

Cette étape ne bloque pas sur ces choix, mais leur sémantique devra être validée avant le chargeur ou le moteur :

1. Les unités et vocabulaires contrôlés des variables (`cadence`, `movement`, `complexity`, etc.) restent volontairement ouverts ; ils devront provenir du référentiel et non des types génériques.
2. Décision validée pour l'étape 2 : `dependentCompetenceIds` est dérivé exclusivement du graphe des `prerequisiteIds`. Il n'est jamais accepté comme donnée source d'une fiche de catalogue.
3. `PedagogicalEvidence.value`, `subjectType` et `sourceType` restent génériques. Leur éventuelle spécialisation en unions discriminées doit être décidée avec les formats réels de référentiel et de décision, sans rétro-interpréter v1.
4. La forme du snapshot historique minimal n'est pas définie ici ; elle appartient au futur contrat de `PedagogicalDecision`, hors périmètre de l'étape 1.

## Arrêt de l'étape

Le chargeur de référentiels, le catalogue A–D, le graphe réel, la persistance, le moteur v2 et toute bascule fonctionnelle restent explicitement hors périmètre. Ils ne doivent commencer qu'après validation de cette étape.

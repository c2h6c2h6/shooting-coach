# Référentiel pédagogique C v1 — Étape 3B-C

## Statut et portée

Lot réel du référentiel pédagogique v2 de Shooting Coach, limité strictement au domaine C — Visée.

La source autoritative est le texte « SOURCE AUTORITATIVE — RÉFÉRENTIEL C — VISÉE v1.0 » fourni pour cette étape. Elle prévaut, pour C uniquement, sur les anciens documents génériques relatifs à la visée.

- `catalogVersion` : `pedagogical-reference-c-v1` ;
- `schemaVersion` : `pedagogical-v2-contracts-v1` ;
- `itemVersion` : `1.0.0` pour les huit compétences et les trois références d’outils réutilisées.

Le catalogue est chargé uniquement en mémoire et n’est importé par aucun moteur, écran, dépôt SQLite ou module actif du produit.

## Compétences importées

| Code | Nom exact | Prérequis directs encodés | Validation | Outils mutualisés associés |
|---|---|---|---|---|
| C1 | Construire l’alignement des organes de visée | Aucun | `instructor` | `REFERENCE_PHOTO`, `MIRROR_FEEDBACK`, `OBSERVATION_VIDEO` |
| C2 | Construire une image de visée | C1 | `instructor` | `REFERENCE_PHOTO`, `OBSERVATION_VIDEO` |
| C3 | Porter son attention sur le bon repère visuel | C1, C2 | `instructor` | `REFERENCE_PHOTO`, `OBSERVATION_VIDEO` |
| C4 | Observer sa zone de stabilité | C3 | `instructor` | `OBSERVATION_VIDEO`, `MIRROR_FEEDBACK` |
| C5 | Comprendre la précision réellement nécessaire | C1, C2, C3 | `instructor` | Aucun outil mutualisé obligatoire |
| C6 | Maintenir une information de visée exploitable pendant l’action sur la détente | C1, C3, C4, C5 | `instructor` | `OBSERVATION_VIDEO` |
| C7 | Assurer le suivi visuel du départ du coup | C3, C6 | `instructor` | `OBSERVATION_VIDEO` |
| C8 | Réacquérir une image de visée exploitable après le départ du coup | C7 | `instructor` | `OBSERVATION_VIDEO` |

Tous les `dependentCompetenceIds` sont dérivés par le chargeur. Aucun n’est enregistré dans le fichier source des compétences.

## Prérequis et références différées

- C4 encode uniquement C3. La mention selon laquelle C1 et C2 sont supposées suffisamment construites en amont est conservée comme note pédagogique.
- C6 encode exactement C1, C3, C4 et C5. C2 est conservée comme compétence implicitement mobilisée, sans devenir une dépendance supplémentaire.
- C8 encode uniquement C7. Les relations pédagogiques reconnues avec A, B et F restent documentaires : la source ne déclare aucune relation A/B précise et F n’est pas importé. Aucune référence cassée n’est créée.

## Distinctions doctrinales préservées

- C1 : géométrie des organes ; C2 : image globale avec la zone visée.
- C2 : ce qui est construit visuellement ; C3 : lieu de l’attention.
- C3 : repère attentionnel ; C4 : observation des oscillations.
- C4 : observation de la zone de stabilité ; C5 : compréhension des conséquences d’une petite imperfection.
- C5 ne porte aucune décision opérationnelle et ne remplace pas le futur domaine H.
- C6 décrit la continuité de l’information visuelle pendant l’action sur la détente ; aucune compétence D n’est importée.
- C7 décrit le suivi visuel pendant et immédiatement après le départ ; C8 décrit la réacquisition ultérieure.

Les limites d’interprétation interdisant de conclure directement d’un résultat en cible à une cause technique sont conservées dans les fiches.

## Outils pédagogiques

Le catalogue C réutilise exclusivement les trois références mutualisées déjà validées :

- `REFERENCE_PHOTO` ;
- `MIRROR_FEEDBACK` ;
- `OBSERVATION_VIDEO`.

Leurs identifiants stables et leurs définitions restent identiques au lot A/B. Leur métadonnée `catalogVersion` est sérialisée pour le lot autonome C, conformément à l’invariant du chargeur qui impose une seule version de catalogue par chargement. Aucun nouvel outil n’est créé.

L’exercice de démonstration « l’horloge » est conservé uniquement dans `pedagogicalSupportNotes` de C5. Il n’existe aucun `ExerciseDefinition` correspondant.

## Données volontairement absentes

Le lot ne contient pas :

- de compétence C9 ni de compétence D à J ;
- d’exercice Gold ou autre exercice réel ;
- de technique pédagogique réelle ;
- d’observation, hypothèse ou test discriminant réel ;
- de règle décisionnelle opérationnelle ;
- de `MasteryState` ou de `PedagogicalDecision` ;
- de migration SQLite, persistance ou interface ;
- de lien direct observation → exercice.

Les tableaux `techniques` et `exercises` du catalogue chargé sont vides.

## Rapport de fidélité et adaptations techniques

| Adaptation | Justification | Effet pédagogique |
|---|---|---|
| Identifiants `competence:<code>` | Le contrat exige un identifiant stable distinct du code. | Aucun changement de contenu. |
| Identifiants `pedagogical-tool:<code>` | Même exigence technique pour les outils. | Aucun changement de contenu. |
| Références des trois outils avec `catalogVersion` C | Le chargeur exige que chaque élément porte la version du catalogue chargé. | Réutilisation des mêmes identités et définitions ; aucun nouvel outil métier. |
| Mentions « lorsque pertinent » dans `pedagogicalSupportNotes` | Préserve la condition contextuelle sans modifier l’identité de l’outil. | Aucun changement de sens. |
| Note de l’horloge dans `pedagogicalSupportNotes` | La source autorise sa conservation mais interdit sa création comme exercice. | Aucun exercice créé. |
| Liens A/B/F de C8 conservés comme note | Aucun lien A/B précis n’est fourni et F est absent. | Aucune dépendance inventée ou cassée. |
| Ponctuation terminale des listes omise | Adaptation de sérialisation cohérente avec le lot A/B. | Aucun changement lexical ou pédagogique. |

Les définitions, objectifs, indicateurs, limites, intitulés et prérequis ont été transcrits sans enrichissement externe.

## Validation automatisée

Les tests exécutent réellement le chargeur sur les fichiers C et vérifient notamment :

- les huit compétences C1–C8 et leurs intitulés exacts ;
- l’absence de C9 et des domaines D–J ;
- l’unicité, les versions, les références résolues et l’absence de cycle ;
- les prérequis déclarés et les dépendances dérivées ;
- le mode `instructor` pour chaque compétence ;
- toutes les distinctions internes imposées ;
- la réutilisation unique des trois outils autorisés ;
- l’absence d’exercice, technique, test, hypothèse, observation et décision réelle.

Le référentiel C reste fonctionnellement inactif. Le domaine D nécessite une validation explicite ultérieure.

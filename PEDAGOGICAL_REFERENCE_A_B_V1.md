# Référentiel pédagogique A/B v1 — Étape 3A

## Statut et provenance

Premier lot réel du référentiel pédagogique v2 de Shooting Coach, limité strictement aux domaines :

- A — Plateforme ;
- B — Prise.

Source autoritative reçue : `Fichier markdown(5).md collé`.

- SHA-256 de la source : `fae4b2e6c51f9ff503d9f7120302231b0b695b06ff48b4eb2c0f688f3a52ee9d` ;
- `catalogVersion` : `pedagogical-reference-ab-v1` ;
- `schemaVersion` : `pedagogical-v2-contracts-v1` ;
- `itemVersion` : `1.0.0` pour les 14 compétences et les 7 outils.

Cette source remplace, pour A et B uniquement, tout contenu pédagogique antérieur. Le catalogue reste chargé uniquement en mémoire et n'est importé par aucun moteur, écran ou dépôt actif.

## Compétences importées

| Code | Nom exact | Prérequis directs | Validation | Outils mutualisés associés |
|---|---|---|---|---|
| A1 | Construire une plateforme corporelle stable, naturelle et reproductible | Aucun | `instructor` | `FLOOR_POSITION_REFERENCES`, `REFERENCE_PHOTO`, `OBSERVATION_VIDEO`, `MIRROR_FEEDBACK` |
| A2 | Maintenir un équilibre corporel stable pendant l’ensemble du cycle de tir | A1 | `instructor` | `FLOOR_POSITION_REFERENCES`, `OBSERVATION_VIDEO`, `MIRROR_FEEDBACK` |
| A3 | Orienter naturellement la plateforme vers la zone de travail | A1, A2 | `instructor` | `FLOOR_POSITION_REFERENCES`, `REFERENCE_PHOTO`, `OBSERVATION_VIDEO` |
| A4 | Construire une stabilité corporelle sans rigidité excessive | A1, A2, A3 | `instructor` | `MIRROR_FEEDBACK`, `OBSERVATION_VIDEO`, `INSTRUCTOR_TACTILE_FEEDBACK` |
| A5 | Conserver l’organisation de la plateforme pendant l’ensemble du cycle | A1, A2, A3, A4 | `instructor` | `FLOOR_POSITION_REFERENCES`, `OBSERVATION_VIDEO`, `REFERENCE_PHOTO` |
| A6 | Reconstruire spontanément une plateforme fonctionnelle et reproductible après l’avoir quittée | A1, A2, A3, A4 | `instructor` | `FLOOR_POSITION_REFERENCES`, `REFERENCE_PHOTO` |
| B1 | Construire la prise de la main forte | Aucun | `instructor` | `REFERENCE_PHOTO`, `MIRROR_FEEDBACK`, `OBSERVATION_VIDEO`, `MARKER_HAND_REFERENCES` |
| B2 | Positionner correctement la main support | B1 | `instructor` | `MARKER_HAND_REFERENCES`, `REFERENCE_PHOTO`, `MIRROR_FEEDBACK`, `OBSERVATION_VIDEO` |
| B3 | Fusionner la main forte et la main support en une seule unité fonctionnelle | B1, B2 | `instructor` | `MARKER_HAND_REFERENCES`, `REFERENCE_PHOTO`, `MIRROR_FEEDBACK`, `OBSERVATION_VIDEO` |
| B4 | Construire une répartition stable des pressions entre main forte et main support | B3 | `instructor` | `BANANA_APPLE_ANALOGY`, `MARKER_HAND_REFERENCES` |
| B5 | Maintenir une pression constante de la main forte pendant l’action de l’index | B1, B3, B4 | `instructor` | `INSTRUCTOR_TACTILE_FEEDBACK`, `OBSERVATION_VIDEO`, `BANANA_APPLE_ANALOGY` |
| B6 | Construire puis maintenir la position fonctionnelle des poignets | B1, B2, B3, B4, B5 | `instructor` | `REFERENCE_PHOTO`, `OBSERVATION_VIDEO` |
| B7 | Conserver une prise cohérente pendant tout le cycle | B1, B2, B3, B4, B5, B6 | `instructor` | `MARKER_HAND_REFERENCES`, `REFERENCE_PHOTO`, `OBSERVATION_VIDEO` |
| B8 | Reconstruire spontanément une prise identique après l’avoir quittée | B1, B2, B3, B4, B5, B6 | `instructor` | `MARKER_HAND_REFERENCES`, `REFERENCE_PHOTO` |

Tous les `dependentCompetenceIds` sont dérivés par le chargeur. Aucun n'est enregistré dans le fichier source des compétences.

## Outils pédagogiques mutualisés

| Code | Définition autoritative |
|---|---|
| `MARKER_HAND_REFERENCES` | Repères temporaires au marqueur sur les mains pour objectiver la position/reproductibilité. |
| `FLOOR_POSITION_REFERENCES` | Repères temporaires au sol. |
| `REFERENCE_PHOTO` | Photographie d’une position validée servant de référence. |
| `MIRROR_FEEDBACK` | Miroir permettant l’auto-observation. |
| `OBSERVATION_VIDEO` | Vidéo utilisée comme feedback ou aide à l’observation, sans validation automatique. |
| `INSTRUCTOR_TACTILE_FEEDBACK` | Contact pédagogique léger permettant de rendre perceptible une variation, lorsqu’il est explicitement pertinent. |
| `BANANA_APPLE_ANALOGY` | Métaphore pédagogique : main forte stable / main support contribuant fortement à la stabilité. Aucun pourcentage biomécanique imposé. |

Ces sept objets sont uniques dans le catalogue. Les variantes contextuelles comme « vidéo de profil », « vidéo rapprochée » ou « photographie avant/après » sont rattachées à l'outil mutualisé correspondant et leur formulation source est conservée dans `pedagogicalSupportNotes`.

Les méthodes qui ne constituent pas l'un des sept objets autorisés ne créent aucun outil supplémentaire. Elles restent également conservées comme notes, notamment :

- verbalisation / scan corporel ;
- auto-comparaison guidée ;
- contrôle visuel différé ;
- démonstration comparative ;
- observation rapprochée ;
- repères visuels temporaires non qualifiés plus précisément.

## B6 — conservation des deux dimensions validées

B6 reste une seule compétence. Les deux dimensions sont sérialisées dans `internalComponents` :

- `B6.1` — construire la géométrie fonctionnelle des poignets ;
- `B6.2` — conserver cette géométrie pendant le cycle.

Les quatre énoncés de la « position de référence validée » sont conservés littéralement dans `referenceStatements`. Aucun angle universel ni nouvelle compétence B6.1/B6.2 n'est créé.

## Séparations doctrinales conservées

- B5 concerne ce que fait la main forte lorsque l'index travaille. Aucun lien vers le domaine D n'existe.
- A5 signifie conserver la plateforme ; A6 signifie la reconstruire après l'avoir quittée. A5 n'est pas un prérequis direct d'A6.
- B7 signifie conserver la prise ; B8 signifie la reconstruire après l'avoir quittée. B7 n'est pas un prérequis direct de B8.

## Données volontairement absentes

Le lot ne contient pas :

- de compétences C à J ;
- de techniques pédagogiques ;
- d'exercices Gold ;
- d'observations, hypothèses ou tests discriminants ;
- de `MasteryState` ou de `PedagogicalDecision` ;
- de contenu `future_video` ;
- de compétence ou relation implicite non présente dans la source ;
- de taxonomie supplémentaire pour les variables pédagogiques.

Les tableaux `techniques` et `exercises` du catalogue chargé sont donc vides.

## Rapport de fidélité et adaptations techniques

| Adaptation | Justification | Effet pédagogique |
|---|---|---|
| Identifiants `competence:<code>` | Le contrat exige un identifiant stable distinct du code. | Aucun changement de contenu. |
| Identifiants `pedagogical-tool:<code>` | Même exigence technique pour les outils. | Aucun changement de contenu. |
| Ajout optionnel de `pedagogicalToolIds` au contrat `Competence` | Le contrat de l'étape 1 ne permettait pas d'associer les outils pourtant présents dans les fiches. | Les outils autorisés sont référencés, sans en créer d'autres. |
| Ajout de `pedagogicalSupportNotes` | Préserve les formulations contextuelles et méthodes qui ne sont pas des objets `PedagogicalTool`. | Aucun objet pédagogique supplémentaire. |
| Ajout de `internalComponents` et `referenceStatements` | Nécessaire pour conserver B6.1, B6.2 et la position de référence sans créer deux compétences. | B6 reste une compétence unique. |
| Normalisation des variantes photo/vidéo/repère vers les sept IDs mutualisés | La source impose sept outils communs non dupliqués. | Aucun changement de sens ; les formulations originales restent en notes. |
| Suppression des ponctuations de fin de puce lors de la sérialisation | Adaptation JSON uniquement. | Aucun changement lexical ou pédagogique. |

Les définitions, objectifs, indicateurs, limites, intitulés et prérequis ont été transcrits sans enrichissement externe.

## Validation

Les tests exécutent réellement le chargeur sur les deux fichiers JSON et vérifient :

- les 14 compétences et leurs intitulés exacts ;
- l'absence des domaines C–J ;
- les versions et l'unicité globale ;
- les prérequis et dépendances dérivées ;
- l'absence de cycles et de références cassées ;
- les modes `instructor` ;
- les distinctions A5/A6, B5/B6 et B7/B8 ;
- les composantes internes B6.1/B6.2 ;
- les sept outils mutualisés ;
- l'absence d'exercice et de technique.

Le référentiel reste fonctionnellement inactif. L'intégration des domaines C ou D nécessite une validation explicite ultérieure.

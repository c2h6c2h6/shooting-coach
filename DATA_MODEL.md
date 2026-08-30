# Modèle de données

Tous les identifiants métier sont des UUID. Les référentiels utilisent des codes
stables (`OBS_001`) et une version de catalogue.

| Entité | Champs structurants |
|---|---|
| User (futur, non persisté) | id, rôle, nom affiché, identité d’authentification |
| ShooterProfile | id, latéralité, œil directeur?, niveau, armes |
| Weapon | id, modèle, calibre?, paramètres |
| Session | id, profileId, mode, arme, date, statut, distance, cible, objectif |
| Series | id, sessionId, ordre, type, statut, coups prévus/réalisés, intention, cadence, durée |
| PhysicalTarget | id, sessionId, type, dimensions réelles |
| TargetImage | id, physicalTargetId, URI, rôle, date, calibration, perspective |
| Impact | id, seriesId, targetImageId?, xMm, yMm, source, confirmé |
| SeriesMetrics | seriesId, nombre, centre moyen, décalages, largeur, hauteur, diamètre extrême, distances moyennes |
| Observation | code, version, faits et conditions calculables |
| Hypothesis | code, version, compétence liée, limite d’interprétation |
| Evidence | code, hypothesisCode, sens, poids, condition |
| DiagnosticTest | code, version, protocole, résultat attendu |
| Skill | code, version, nom et critères |
| Exercise | code, version, consigne, difficulté, sécurité |
| DecisionRule | code, version, priorité, conditions, action |
| EngineDecision | id, seriesId, versions, faits, scores, incertitude, action |
| InstructorComment | id, sessionId/seriesId, auteur, texte, date |

## Invariants

- `laterality` n’est jamais nulle au démarrage d’une séance.
- Une série possède ses propres contexte, intention, impacts, mesures et décisions.
- Un impact appartient obligatoirement à une série. Son image source est
  facultative, car le placement numérique manuel précède l’import photo.
- Une image appartient à une cible physique et possède un rôle explicite :
  `before_series`, `after_series`, `intermediate`, `final` ou `cumulative`.
- La présence visuelle d’un impact sur une photographie ne suffit jamais à
  l’attribuer automatiquement à une série.
- Les coordonnées sont stockées dans le repère physique de la cible, origine au
  centre, en millimètres; l’image conserve sa transformation de calibration.
- Une décision conserve la version exacte des règles et référentiels utilisés.
- Une hypothèse n’est jamais stockée comme cause confirmée.
- Une séance terminée est immuable; une correction crée une révision traçable.

## Cycle de vie

Une séance suit `draft → active → completed` ou `cancelled`.

Une série suit exclusivement :

- `planned → active` ;
- `planned → cancelled` ;
- `active → completed` ;
- `active → cancelled`.

## Schéma SQLite actuellement implémenté

### `shooter_profiles`

| Colonne | Type | Contrainte |
|---|---|---|
| id | TEXT | clé primaire, UUID |
| display_name | TEXT | obligatoire, au moins 2 caractères après trim |
| laterality | TEXT | `right` ou `left`, obligatoire |
| declared_level | TEXT | `beginner`, `intermediate` ou `advanced` |
| primary_weapon | TEXT | `glock-19`, `glock-48` ou `glock-43x` |
| created_at | TEXT | date ISO 8601 |
| updated_at | TEXT | date ISO 8601 |

### `app_settings`

Une seule ligne (`singleton_key = 1`) contient `active_profile_id`, clé étrangère
nullable vers `shooter_profiles`. La suppression du profil actif place cette
valeur à `NULL` grâce à `ON DELETE SET NULL`.

### `weapons`

Référentiel local extensible : `id` stable, `name`, `active`. La migration 2
contient `glock-19`, `glock-48` et `glock-43x`.

### `target_types`

Référentiel local extensible : `id` stable, `name`, `active`, `width_mm?`,
`height_mm?`. La migration 2 contient `generic-centered`, `fftir` et
`other-paper`. Les dimensions restent nulles tant qu’une valeur de référence
fiable n’a pas été validée.

### `sessions`

| Groupe | Colonnes |
|---|---|
| Identité | `id`, `shooter_profile_id` |
| Configuration | `mode`, `status`, `weapon_id`, `distance_mm`, `target_type_id` |
| Objectif | `objective_type?`, `objective_label?`, `selected_skill_id?` |
| Snapshot tireur | `shooter_display_name_snapshot`, `shooter_laterality_snapshot` |
| Snapshot matériel | `weapon_name_snapshot`, `target_type_name_snapshot`, dimensions facultatives |
| Cycle de vie | `started_at?`, `completed_at?`, `created_at`, `updated_at` |

Valeurs autorisées :

- `mode` : `coaching_free`, `training` ;
- `status` : `draft`, `active`, `completed`, `cancelled` ;
- `objective_type` : `free_text`, `provisional_skill` ou `NULL` ;
- `distance_mm` : entier entre 1 000 et 100 000.

Les clés étrangères vers le profil, l’arme et la cible utilisent
`ON DELETE RESTRICT`. Une séance ne peut donc pas perdre silencieusement son
contexte courant. Le repository refuse aussi explicitement la suppression d’un
profil ayant au moins une séance.

Le snapshot est obligatoire et écrit une seule fois à la création. Une
modification ultérieure du profil ou du libellé d’un référentiel ne modifie pas
la séance historique.

### `series`

| Groupe | Colonnes |
|---|---|
| Identité et ordre | `id`, `session_id`, `sequence_number` |
| Intention | `type`, `instruction?`, `pedagogical_objective?`, `selected_skill_id?` |
| Coups | `expected_shot_count`, `recorded_shot_count` |
| Cadence | `cadence_type?`, `duration_seconds?` |
| Cycle de vie | `status`, `started_at?`, `completed_at?`, `created_at`, `updated_at` |
| Complément | `notes?` |

Types autorisés : `reference`, `diagnostic`, `corrective`, `consolidation` et
`progression`. Statuts autorisés : `planned`, `active`, `completed` et
`cancelled`. La cadence facultative accepte `free`, `timed`, `fixed_interval`
ou `unknown`.

`expected_shot_count` est compris entre 1 et 50 ;
`recorded_shot_count` entre 0 et 50. Ils ne sont pas obligatoirement égaux.
`UNIQUE(session_id, sequence_number)` stabilise l’ordre. Un index unique partiel
garantit une seule série `active` par séance. La clé étrangère vers `sessions`
utilise `ON DELETE RESTRICT`.

La migration 3 ajoute aussi un déclencheur empêchant le passage d’une séance à
`completed` tant qu’une de ses séries est active.

## Mesures prévues pour une série

Soient les impacts \(p_i=(x_i,y_i)\), le centre réel \(O=(0,0)\), le nombre
d’impacts \(n\), et le centre moyen \(G=(\bar{x},\bar{y})\).

- nombre pris en compte : \(n\) ;
- centre moyen : \(\bar{x}=\frac{1}{n}\sum x_i\),
  \(\bar{y}=\frac{1}{n}\sum y_i\) ;
- décalage horizontal : \(\bar{x}\) ;
- décalage vertical : \(\bar{y}\) ;
- largeur : \(\max(x_i)-\min(x_i)\) ;
- hauteur : \(\max(y_i)-\min(y_i)\) ;
- diamètre extrême : \(\max_{i,j}\lVert p_i-p_j\rVert\) ;
- distance moyenne au centre réel :
  \(\frac{1}{n}\sum\lVert p_i-O\rVert\) ;
- distance moyenne au centre du groupement :
  \(\frac{1}{n}\sum\lVert p_i-G\rVert\).

Les quatre premières mesures de distance au centre réel décrivent la précision
absolue. Les dimensions et la distance moyenne à \(G\) décrivent la dispersion
interne. Les conventions pour zéro impact seront fixées et testées à l’étape 6.
# Impact — étape 5

Chaîne obligatoire : `ShooterProfile → Session → Series → Impact`.

| Champ | Règle |
|---|---|
| `id` | UUID |
| `seriesId` | série propriétaire obligatoire |
| `sequenceNumber` | entier ≥ 1, unique dans la série |
| `normalizedX`, `normalizedY` | nombres entre 0 et 1, source de vérité |
| `targetX`, `targetY` | facultatifs, réservés |
| `physicalXmm`, `physicalYmm` | facultatifs ; `NULL` à cette étape |
| `source` | `manual` à cette étape ; modèle compatible `automatic` et `corrected` |
| `confidence` | `NULL` à cette étape |
| `isExcluded` | `false` par défaut |
| `exclusionReason` | obligatoire seulement si l’impact est exclu |
| `createdAt`, `updatedAt` | dates ISO |

Convention :

- `(0, 0)` : coin supérieur gauche ;
- `(1, 1)` : coin inférieur droit ;
- `(0,5, 0,5)` : centre logique ;
- X croît vers la droite, Y vers le bas.

Trois repères restent séparés : écran (interaction éphémère), normalisé (vérité persistée), physique (millimètres futurs). Aucune conversion physique n’est inventée.

`expectedShotCount`, `recordedShotCount` et le nombre d’impacts sont indépendants et peuvent différer.

## `series_metrics` — étape 6

La migration 5 persiste : série, versions d’algorithme et de géométrie, liste
des impacts inclus, comptages, mesures normalisées, mesures physiques
facultatives, forme, impacts éventuellement atypiques et date de calcul.

- 0 impact : aucune mesure (`NULL`) ;
- 1 : position et distance au centre, aucune dispersion ;
- 2 : centre, décalage, largeur, hauteur, diamètre et dispersion limitée ;
- 3–4 : mesures complètes et forme prudente ;
- ≥5 : signalement atypique éventuel.

Les impacts exclus et leur raison sont conservés. La source de vérité demeure
la table `impacts`, ce qui permet tout recalcul futur.

## `series_comparisons` — étape 7

La migration 7 persiste l’identifiant de séance, les deux séries, le type
(`reference`, `previous`, `manual`), le statut, les versions d’algorithme,
de seuils et de mesures, le résultat structuré JSON et `computed_at`.

Convention pour toute grandeur \(m\) :

\[
\Delta m = m_{\mathrm{série\ comparée}} - m_{\mathrm{référence}}
\]

Le pourcentage relatif vaut \(100 \times \Delta m / |m_\mathrm{référence}|\).
Il est omis si la valeur de référence est nulle ou de valeur absolue
inférieure ou égale à 0,001. Les comptages inclus/exclus restent visibles.
La comparaison officielle utilise uniquement les impacts inclus.

Une contrainte unique évite les doublons pour un couple, un type et une version
d’algorithme. Les déclencheurs sur `series_metrics` suppriment les résultats
obsolètes dès qu’une série est recalculée.

## `shooting_observations` — étape 8

La migration 8 persiste : séance, série ou comparaison source, code, catégorie,
portée, statut, magnitude, confiance, rang, versions, métriques justificatives,
limitations et date. Portées : `single_series`, `comparison`,
`session_pattern`. Statuts : `confirmed_by_rules`, `tentative`,
`insufficient_data`, `contradictory_data`.

Les observations sont recalculables. Une modification de mesures ou de
comparaison supprime les observations dépendantes.
# TechnicalHypothesis — étape 9

`TechnicalHypothesis` conserve l’observation source, le code et la famille de cause, le statut, la plausibilité, la confiance, le rang, le score interne, les indices pour/contre, les besoins d’information, le contexte applicable, les règles sources et leur version.

Migration 9 :

- `technical_hypotheses` : résultats recalculables ;
- `diagnostic_questions` : définitions versionnables ;
- `diagnostic_answers` : réponse `yes`, `no`, `uncertain` ou `not_observed`.

Toute modification d’une observation ou d’une réponse invalide les hypothèses dépendantes.
# Modèle étape 10

`ConfirmationTestDefinition`, `ConfirmationTestRun`, `CoachingRecommendation`, `TrainingDrill` et `CoachingCycle` sont distincts.

Migration 10 :

- `confirmation_test_runs` : série source, hypothèse, test, statut, résultat, dates et version ;
- `coaching_recommendations` : hypothèse, test facultatif, priorité, statut et version ;
- `coaching_cycles` : chaîne complète entre série source et série de contrôle.

Une contrainte SQLite limite une séance à un cycle non terminé. Les clés étrangères utilisent `RESTRICT` afin de préserver l’historique. Une modification d’observation invalide un cycle ouvert ; un cycle achevé reste historiquement stable. Les catalogues restent versionnés dans le code.

Résultats de test : `supports_hypothesis`, `weakly_supports_hypothesis`, `does_not_support_hypothesis`, `contradicts_hypothesis`, `inconclusive`, `not_observed`. Aucun statut `confirmed` n’existe.

Résultats pédagogiques : `objective_improved`, `objective_stable`, `objective_worsened`, `mixed_result`, `insufficient_data`.
## Migration 11 — validation du MVP

`sessions.data_partition` distingue `real`, `demo` et `automated_test`.
Les scénarios simulés sont toutefois conservés dans `synthetic_demo_runs` et
ne sont jamais matérialisés comme séances réelles.

Nouvelles tables :

- `reasoning_traces` : sources, versions, règles, seuils, candidats et choix ;
- `shooter_feedback` et `instructor_feedback` : retours structurés distincts ;
- `human_hypothesis_reviews` : avis humain sans réécriture du moteur ;
- `local_issue_reports` : écran, liens métier, version, gravité et description ;
- `demo_state` et `synthetic_demo_runs` : activation et résultats simulés.

Les séries et cycles achevés disposent de garde-fous d’immuabilité en base.
Les exports JSON conservent les objets bruts, les sections sémantiques et les
versions des référentiels.

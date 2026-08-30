# Architecture

## Architecture fonctionnelle

1. **Profils et rôles** : tireur, instructeur.
2. **Séance** : contexte, mode, objectif et suite de séries.
3. **Acquisition cible** : image, calibration, impacts.
4. **Mesures** : centre, largeur, hauteur, dispersion, décalage, isolés.
5. **Moteur pédagogique** : faits → hypothèses → incertitude → action suivante.
6. **Référentiels** : observations, hypothèses, indices, tests, compétences,
   exercices et règles.
7. **Historique** : progression par séance et compétence.
8. **Explication** : présentation fidèle de la décision du moteur.

## Architecture technique recommandée

- **Client mobile** : React Native + Expo + TypeScript strict.
- **Navigation** : Expo Router.
- **Données locales** : SQLite avec migrations versionnées (profils, référentiels
  minimaux, séances et séries implémentés).
- **Images** : fichiers locaux, base contenant seulement URI et métadonnées.
- **Moteur** : TypeScript pur, sans dépendance UI, testable par fixtures.
- **Référentiels** : JSON versionnés et validés par schémas.
- **Synchronisation** : API ajoutée après validation du pilote; le domaine ne
  dépend pas du fournisseur de backend.
- **Backend recommandé ensuite** : PostgreSQL + API TypeScript, stockage objet
  privé pour les photos, authentification par rôles.
- **IA visuelle** : adaptateur séparé; ses coordonnées sont toujours corrigibles.
- **IA générative** : uniquement couche d’explication contrainte par la sortie
  structurée du moteur.

## Modules

```text
Interface mobile
  -> Cas d’usage
    -> Domaine (entités, mesures, moteur)
      -> Ports (profils, séances, images, référentiels)
        -> Adaptateurs (SQLite, fichiers, future API, future vision)
```

Cette séparation permet d’ajouter le mode Protecteur comme module distinct sans
polluer le moteur sportif.

## Tranche verticale de l’étape 4

`Series` et sa validation sont dans le domaine pur. `SeriesRepository` constitue
le port indépendant de SQLite. `SqliteSeriesRepository` assure la création,
l’ordre, la lecture et les transitions. L’interface ne connaît aucune requête
SQL.

Le démarrage d’un Coaching libre forme une unité transactionnelle : passage de
la séance à `active`, puis création idempotente d’une série de référence si
aucune série n’existe. L’interface comprend la liste ordonnée, la création, le
détail, le démarrage, l’achèvement manuel et l’annulation.

## Limite entre User et ShooterProfile

`ShooterProfile` représente les caractéristiques techniques du tireur nécessaires
au coaching. Il existe dès le pilote local.

`User` représentera plus tard une identité authentifiée, ses rôles et ses droits.
Il reste prévu dans l’architecture mais n’est ni créé ni persisté dans le pilote.
Un profil local n’a donc actuellement aucun `userId`.

## Hypothèses techniques

- iOS et Android sont ciblés avec une base de code commune.
- Le stand peut avoir une connectivité faible : la séance doit fonctionner hors
  ligne.
- Les dimensions réelles et la calibration sont nécessaires pour exprimer les
  mesures en millimètres.
- Une cible physique possède plusieurs captures. Une capture peut montrer
  plusieurs séries, mais chaque impact est attribué explicitement à une série.
- Les données du pilote sont sensibles mais ne sont pas des données médicales.

## Décisions désormais résolues

- « Vue instructeur » et « groupe fermé » impliquent une synchronisation et une
  gestion des droits, alors que le MVP peut être local. Proposition : pilote
  local d’abord, partage/synchronisation dans un second jalon.
- Une série peut avoir une photo « avant ou après » : une photo avant n’a pas
  d’impacts nouveaux. Il faut modéliser le rôle de l’image, pas un seul champ.
- La précision absolue par rapport au centre réel et la dispersion interne autour
  du centre moyen sont deux familles de mesures distinctes.
- Les impacts isolés exigent un seuil statistique et assez de coups. Ils ne
  doivent pas être automatiquement qualifiés d’erreurs.
- La cadence/durée n’est objective que si chronométrée dans l’app ou saisie par
  l’instructeur.
# Ajout architectural — étape 5

- `src/domain/impact.ts` : modèle et validation purs.
- `src/domain/targetGeometry.ts` : conversions écran ↔ normalisé, indépendantes de React Native et de SQLite.
- `src/application/impactRepository.ts` : contrat de persistance.
- `src/infrastructure/impacts/sqliteImpactRepository.ts` : implémentation SQLite et contrôle du statut de la série.
- `src/ui/ImpactProvider.tsx` : exposition des cas d’usage à l’interface.
- `app/sessions/[id]/series/[seriesId]/impacts.tsx` : saisie mobile.

L’écran travaille sur une copie locale. Chaque ajout, déplacement ou suppression pousse l’état précédent dans une pile en mémoire. « Confirmer » remplace transactionnellement l’état SQLite de la série active. La pile d’interface n’est pas persistée.

Le module géométrique ne contient aucun calcul de groupement, scoring ou interprétation.

## Ajout architectural — étape 6

- `targetCoordinateConversion.ts` : normalisé → logique centré → physique,
  avec inversion documentée de Y.
- `seriesMetrics.ts` : géométrie pure, sans React, Expo, SQLite ou pédagogie.
- `SeriesMetricsRepository` et `SqliteSeriesMetricsRepository` : port et
  adaptateur de persistance.
- `SeriesMetricsProvider` : liaison des cas d’usage à l’écran.

Le résultat versionné est reproductible depuis les impacts. Une confirmation
des impacts invalide le cache ; l’ouverture du détail recalcule et persiste.

## Ajout architectural — étape 7

- `seriesComparison.ts` : règles pures de compatibilité, deltas, seuils et
  fiabilité factuelle ;
- `comparisonSummary.ts` : phrases descriptives issues uniquement de données
  structurées ;
- `SeriesComparisonRepository` : port métier ;
- `SqliteSeriesComparisonRepository` : calcul à la demande, persistance et
  relecture ;
- `SeriesComparisonProvider` et écran `compare.tsx` : orchestration et interface.

Le domaine n’importe ni React Native, ni Expo, ni SQLite, ni moteur pédagogique.
Les déclencheurs SQLite invalident toute comparaison liée lorsqu’une ligne
`series_metrics` est insérée, modifiée ou supprimée. Le prochain affichage
recalcule les deux mesures et la comparaison.

## Ajout architectural — étape 8

- `observationCatalog.ts` : codes stables, catégories et libellés français ;
- `observationRules.ts` : seuils centralisés et versionnés ;
- `shootingObservation.ts` : règles pures de série, comparaison et répétition ;
- `ShootingObservationRepository` et son adaptateur SQLite : persistance,
  relecture, régénération et invalidation ;
- `ShootingObservationProvider` : orchestration d’interface.

Le domaine n’importe ni React Native, ni Expo, ni SQLite, ni modèle de langage.
La chaîne reste : impacts → mesures → comparaisons → observations. La migration
8 rétablit aussi l’immuabilité SQLite des impacts d’une série `completed`.
# Étape 9

Le domaine pur ajoute `technicalHypothesisCatalog`, `observationHypothesisMappings`, `technicalHypothesis` (moteur de score et résolution des redondances), `diagnosticQuestionCatalog` et `hypothesisExplanation`. Ces modules n’importent ni React Native, ni Expo, ni SQLite, ni service distant.

L’infrastructure persiste les résultats et réponses dans `technical_hypotheses` et `diagnostic_answers`. L’interface ne prend aucune décision métier et dérive tous ses textes des structures du domaine.
# Ajout d’architecture — étape 10

Le domaine ajoute des modules indépendants sans dépendance React Native, Expo, SQLite, réseau ou modèle génératif :

- `confirmationTestCatalog` et `confirmationTestEngine` ;
- `coachingRecommendationCatalog` ;
- `trainingDrillCatalog` ;
- `coachingSafetyRules` ;
- `coachingCycleEngine` ;
- `coachingOutcomeEvaluator`.

Les catalogues portent des codes stables et `coaching-rules-v1`. Le moteur sélectionne au plus un test principal et une alternative à sec. Les règles de sécurité sont évaluées avant l’applicabilité. La couche UI orchestre la saisie et la couche infrastructure persiste les objets sans prendre de décision.

Le flux dépend d’une `TechnicalHypothesis` existante : aucune API de coaching n’accepte directement des coordonnées d’impact ou un code d’observation.
## Consolidation et audit du MVP — étape 11

La chaîne métier est auditée comme un graphe d’objets liés par identifiants.
Chaque sortie conserve ses sources et ses versions. Une observation ne peut
être expliquée que par ses métriques ; une hypothèse par une observation ; un
test par une hypothèse ; une recommandation par un résultat compatible ; une
série de contrôle par son cycle source.

Modules indépendants ajoutés :

- `syntheticScenarioCatalog` et `syntheticScenarioRunner` ;
- `reasoningJournal` ;
- `contentAudits` ;
- `localExports` et `localExportService` ;
- `MvpValidationRepository` ;
- `DemoModeProvider`.

Les données simulées sont enregistrées dans `synthetic_demo_runs`. Elles ne
créent ni profil, ni séance, ni série dans l’historique réel. Les tests
automatisés utilisent exclusivement des objets en mémoire.

Le domaine reste sans dépendance React Native, Expo, SQLite ou distante. Seule
la couche application utilise le système de fichiers local et la feuille de
partage du téléphone pour remettre un fichier à l’utilisateur.

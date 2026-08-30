# Hotfix UX/logique — préparation de séance et clôture diagnostique

## Préparation de séance

Le bouton `Démarrer une séance` de l’accueil ouvre désormais un unique écran `Préparer la séance`. Il réutilise la page de configuration existante et préremplit les valeurs avec le profil actif, la dernière séance de coaching compatible, les références actives et les défauts existants.

Les paramètres réellement portés par `SessionDraft` sont modifiables : tireur affiché, mode, arme, distance standard ou personnalisée et type de cible. Le bouton unique `Démarrer la séance` crée et active la séance et sa série de référence, active celle-ci, puis ouvre directement la saisie des impacts. Aucun récapitulatif, brouillon visible ou second démarrage n’est réintroduit.

### Limite constatée : nombre de mains

`numberOfHands` existe dans `PedagogicalVariables` v2, mais pas dans `SessionDraft`, `Session`, le repository de séances ou la table SQLite `sessions`. L’afficher dans la préparation aurait créé une valeur éphémère et trompeuse. Il n’est donc pas encodé par ce hotfix. Le rendre réellement disponible demandera une décision de modélisation transversale et, pour le conserver entre les écrans et les relances, probablement une évolution SQLite explicitement autorisée.

## Fermeture de la série diagnostique

La série de confirmation utilise les structures SQLite v12 existantes :

- `ConfirmationTestRun.sourceSeriesId` : série ayant produit la question ;
- `ConfirmationTestRun.hypothesisId` : piste testée ;
- `ConfirmationTestRun.testCode` : `controlled_follow_up_series`, identité existante de la question ;
- `ConfirmationTestRun.generatedSeriesId` : série diagnostique créée ;
- `CoachingCycle.confirmationTestRunId` : cycle persistant associé.

La série diagnostique est comparée directement à sa source par `SqliteSeriesComparisonRepository` et l’algorithme de comparaison existant. L’interprétation utilise uniquement ses statuts et variations déjà calculés :

- décalages horizontal et vertical stables ou légers : piste renforcée ;
- retour notable du centre vers le centre de cible : piste affaiblie ;
- contexte incompatible, données manquantes, cadence différente ou limitation matérielle importante : non concluant.

Ces conclusions restent prudentes et ne produisent aucun diagnostic certain.

La combinaison source/hypothèse/test est recherchée avant toute création. Si elle possède déjà une série générée, cette série est réouverte. Sur une série diagnostique terminée, le résultat spécifique domine l’écran et l’analyse générale reste repliée ; elle ne peut pas reproposer la même confirmation.

## QA manuel

### Préparation

1. Depuis l’accueil, toucher `Démarrer une séance`.
2. Vérifier l’écran `Préparer la séance`.
3. Modifier arme, distance, cible ou mode.
4. Toucher `Démarrer la séance`.
5. Vérifier l’arrivée directe sur la saisie des impacts.

### Confirmation

1. Terminer une série de référence décalée.
2. Créer la série de confirmation.
3. Saisir et analyser la série diagnostique.
4. Vérifier que `Résultat du test` apparaît avant l’analyse générale.
5. Vérifier l’une des conclusions renforcée, affaiblie ou non concluante.
6. Revenir à la série source et vérifier que l’action devient `Voir le résultat du test`.
7. Vérifier qu’aucune troisième série identique n’est créée.

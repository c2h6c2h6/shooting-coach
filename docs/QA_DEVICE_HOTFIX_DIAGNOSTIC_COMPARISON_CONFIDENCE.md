# Hotfix QA appareil — diagnostic, comparaison et confiance

## Reproduction et causes

### Résultat diagnostique absent

Sur une série de confirmation terminée, l’écran exécutait d’abord le pipeline général
`mesures → observations → hypothèses`, puis seulement `resolveBiasConfirmation`.
La comparaison déclenchait l’erreur de clé étrangère décrite ci-dessous : le chargement
s’arrêtait avant d’alimenter `diagnosticResult` et l’écran retombait sur la présentation
générale sans hypothèse utile.

La résolution du `ConfirmationTestRun` est désormais prioritaire. Le résultat spécifique
reste affiché même si le chargement secondaire de l’analyse générale échoue.

### Erreur SQLite FOREIGN KEY

`SqliteSeriesComparisonRepository.compareAndSave` recalculait et réécrivait les métriques
des deux séries, y compris lorsqu’elles étaient déjà persistées. L’`UPDATE` de
`series_metrics` active le trigger `series_metrics_invalidate_observations_update`, qui
supprime les observations de la série. La suppression invalide la `technical_hypothesis`
source ; cette suppression est refusée lorsque `confirmation_test_runs.hypothesis_id`
référence encore `technical_hypotheses.id` (`ON DELETE RESTRICT`). Expo remonte alors
`Error code 19: FOREIGN KEY constraint failed` lors de la finalisation de la requête.

La comparaison réutilise maintenant `getLatest` et ne calcule/persiste les métriques que
si elles sont absentes. Les séries terminées ayant des impacts immuables, ces métriques
sont la source persistée pertinente. Un identifiant de comparaison déjà existant est aussi
conservé lors d’un nouvel UPSERT, afin de ne pas casser les références filles.

### Libellé de confiance

Le pilote affichait directement `confidenceLevel`, d’où `confiance low`. La donnée interne
reste inchangée et une présentation centralisée traduit désormais : `low → faible`,
`medium → moyenne`, `high → élevée`.

## QA manuelle appareil

### Série diagnostique

1. Terminer une série de référence décalée.
2. Créer puis terminer sa série de confirmation.
3. Vérifier que « Résultat du test » apparaît avant l’analyse générale.
4. Vérifier le résultat renforcé, affaibli ou non concluant.
5. Vérifier qu’aucune confirmation identique n’est proposée.

### Comparaison

1. Depuis la série 2, ouvrir « Comparer cette série ».
2. Comparer à la série 1 comme référence.
3. Refaire le test par l’option série précédente si elle pointe aussi sur la série 1.
4. Vérifier l’absence d’`Error code 19` et l’affichage de la comparaison.

### Pilote D4

1. Ouvrir le pilote D4 sur une série terminée.
2. Vérifier l’affichage « Confiance : faible/moyenne/élevée ».
3. Vérifier l’absence du libellé brut « confiance low ».


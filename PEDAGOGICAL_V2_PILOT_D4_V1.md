# Pilote pédagogique v2 D4 — version 1

## Objectif et périmètre

Ce pilote relie une série réelle terminée et une observation factuelle v1 au contenu pédagogique réel D4. Il permet à un instructeur de réaliser `TEST-D4-01`, d’en saisir explicitement le résultat et les evidence, puis de confirmer une décision `MAINTAIN`, `TECH-D4-01` et `EX-D4-01`.

Il ne remplace pas le moteur v1 et n’en modifie aucune donnée.

## Feature flag

Le parcours est désactivé par défaut. Il est visible uniquement lorsque la variable de build suivante vaut exactement `true` :

```text
EXPO_PUBLIC_PEDAGOGICAL_V2_PILOT=true
```

Ce flag est indépendant du mode Démo.

## Parcours utilisateur

1. Terminer une série réelle afin que les observations v1 soient disponibles.
2. Ouvrir `Pilote v2 — examiner D4` depuis la série terminée.
3. Sélectionner explicitement une observation factuelle.
4. Choisir explicitement d’examiner D4.
5. Lire les conditions, limites et critères d’arrêt de `TEST-D4-01`.
6. Confirmer que le test a été réalisé sous supervision instructeur.
7. Saisir manuellement le statut et, pour `usable`, l’effet, la force, la fiabilité et le rationale de l’evidence.
8. Pour un résultat `usable`, confirmer séparément `MAINTAIN`, `TECH-D4-01` et `EX-D4-01`.
9. Consulter la technique et l’exercice réels affichés.

Un résultat `non_discriminating` ou `inconclusive` termine le flux sans décision d’intervention, technique ou exercice.

## Invariants

- L’observation ne sélectionne jamais D4.
- Aucun mapping hypothèse v1 vers incertitude v2 n’est exécuté.
- Aucun ranking ou diagnostic automatique n’est produit.
- `TEST-D4-01` ne sélectionne ni technique ni exercice.
- `MAINTAIN`, `TECH-D4-01` et `EX-D4-01` sont confirmés explicitement.
- Aucun `MasteryEvent` n’est produit.
- Le coaching v1 continue à fonctionner séparément.

## Caractère non historisé

Les résultats, evidence et décisions v2 restent en mémoire locale à l’écran. Ils disparaissent à la fermeture du parcours. Aucune table, migration, sauvegarde ou export v2 n’est créé.

## QA manuelle

Dans un build avec le flag absent ou différent de `true`, vérifier que le bouton pilote est absent.

Dans un build pilote :

1. terminer une série comportant au moins une observation v1 ;
2. vérifier que le bouton n’apparaît que sur la série terminée ;
3. vérifier l’absence de présélection d’observation, D4, effet, technique et exercice ;
4. vérifier qu’un résultat ne peut pas être validé sans confirmation de supervision ;
5. vérifier les branches `non_discriminating` et `inconclusive`, sans intervention ;
6. vérifier que `usable` seul n’affiche pas encore l’intervention ;
7. confirmer séparément `MAINTAIN`, `TECH-D4-01` et `EX-D4-01`, puis vérifier leur affichage ;
8. quitter et rouvrir l’écran : les données v2 précédentes ne doivent plus être présentes ;
9. vérifier que les écrans et cycles de coaching v1 restent inchangés.

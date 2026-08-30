# Hotfix UX 9B — parcours séance complet

## Périmètre

Ce hotfix simplifie uniquement la présentation et l’orchestration UI de fonctions déjà disponibles. Il ne modifie ni les contrats métier, ni les calculs, ni les règles d’observation/diagnostic, ni les catalogues pédagogiques, ni SQLite.

## Parcours avant / après

Le parcours manuel relevé avant le hotfix comportait jusqu’à 14 actions ou validations visibles hors placement des impacts : nouvelle séance, configuration, vérification, enregistrement du brouillon, démarrage de la séance, ouverture de la série, démarrage de la série, ouverture de la saisie, confirmation de saisie, confirmation du nombre de coups, retour à la série, fin de série, ouverture des résultats et poursuite vers le coaching.

Le cas normal comporte désormais trois actions principales hors placement des impacts :

1. `Démarrer une séance` depuis l’accueil ;
2. `Analyser la série` après placement des impacts ;
3. `Continuer avec le coach` depuis les résultats.

Le premier bouton crée et active la séance, crée la série de référence selon le comportement existant, l’active et ouvre directement la saisie des impacts. Le lien `Modifier` conserve l’accès à la configuration complète.

## Cas normal et ambiguïtés

Pour cinq coups prévus et cinq impacts inclus, le nombre de coups réellement tirés est enregistré automatiquement à cinq. L’analyse sauvegarde les impacts, invalide les métriques antérieures, termine la série, recalcule les métriques, produit les observations et les hypothèses, puis ouvre les résultats.

Une confirmation explicite reste affichée uniquement en cas d’ambiguïté détectable : nombre d’impacts différent du nombre prévu ou présence d’un impact exclu. Les tirs hors cible restent à déclarer par le nombre de coups réellement tirés. Les actions destructives conservent leurs confirmations.

## Restitution

La synthèse factuelle existante est affichée avant les mesures. Un impact déjà identifié comme potentiellement atypique est mis en évidence sans être exclu automatiquement. Les métriques restent inchangées et accessibles sous `Voir les mesures détaillées`.

Le pilote D4 conserve ses valeurs internes, son caractère éphémère et sa logique. L’interface emploie des libellés français, explique les champs manquants, masque les identifiants et le JSON techniques, et présente d’abord l’exercice et sa consigne. La force et la fiabilité restent saisies manuellement de 0 à 1 ; ce point demeure un retour QA à réexaminer ultérieurement.

## QA manuel cible

1. Ouvrir l’application avec un profil actif et des références disponibles.
2. Toucher `Démarrer une séance`.
3. Vérifier l’arrivée directe sur la saisie de la série de référence.
4. Placer cinq impacts.
5. Toucher `Analyser la série` et vérifier l’absence de confirmation du nombre de coups.
6. Vérifier la synthèse, la mise en évidence éventuelle de l’impact isolé et l’accès replié aux mesures.
7. Toucher `Continuer avec le coach`.

Contrôle complémentaire : refaire le parcours avec quatre ou six impacts, puis avec un impact exclu, et vérifier que la confirmation du nombre de coups apparaît seulement dans ces cas.

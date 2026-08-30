# Coach Tir

## Version installable de démonstration

La configuration EAS de démonstration est décrite dans
[`DEMO_DISTRIBUTION.md`](./DEMO_DISTRIBUTION.md). Le profil `preview` produit
une application iPhone autonome en distribution interne, sans Expo Go ni
ordinateur allumé après l'installation. La création effective du lien requiert
la connexion aux comptes Expo et Apple Developer du propriétaire.

Application mobile de coaching technique pour le tir sportif au pistolet.

## État actuel

Étape 6 terminée : une séance
contient des séries ordonnées et chaque série active peut recevoir des impacts
placés manuellement sur une cible numérique. Les coordonnées et toutes les
données métier restent locales.

Les impacts produisent désormais des mesures géométriques objectives,
versionnées et recalculables. Les photographies, comparaisons et décisions
pédagogiques ne sont pas implémentées.

## Lancer

```bash
npm install
npm test
npm run typecheck
npx expo-doctor
npm start
```

Scanner ensuite le QR code avec Expo Go, ou ouvrir un simulateur iOS/Android.
La procédure détaillée, les écrans et le parcours de revue figurent dans
[VISUAL_REVIEW.md](VISUAL_REVIEW.md).

## Parcours téléphone de l’étape 5

1. Créer un Coaching libre et l’enregistrer en brouillon : aucune série ne doit
   encore être créée.
2. Démarrer la séance : une seule série 1 de type **Référence**, planifiée pour
   5 coups, doit apparaître.
3. Revenir ou relancer l’application : aucune seconde série de référence ne doit
   apparaître.
4. Ouvrir la série, la démarrer et vérifier son statut **Active**.
5. Choisir **Saisir les impacts**, placer puis déplacer des marqueurs.
6. Tester annuler, rétablir, supprimer, zoomer et recentrer.
7. Confirmer un nombre d’impacts inférieur, égal puis supérieur aux coups
   prévus.
8. Saisir un nombre de coups réel différent de 5 : l’écart doit être conservé.
9. Terminer la série et vérifier le statut **Terminée** et la lecture seule.
10. Ajouter deux séries : les numéros suivants doivent être proposés et la liste
   doit rester ordonnée.
11. Démarrer une série, puis essayer d’en démarrer une autre : l’action doit être
   refusée.
12. Annuler une série planifiée puis une série active ; elles restent visibles.
13. Démarrer une séance **Entraînement** : aucune série automatique ne doit
    apparaître. Ajouter manuellement la première série et vérifier le
    préremplissage de l’objectif.
14. Fermer complètement puis relancer : ordre, statuts, coups et impacts sont
    conservés.

Pour repartir d’une base vierge pendant le pilote, supprimer les données locales
de l’application depuis le téléphone ou réinstaller Expo Go/l’application.

La validation finale de `expo-sqlite` reste à effectuer sur un téléphone réel.

## Documentation

- [Vision produit](PRODUCT_VISION.md)
- [Périmètre MVP](MVP_SCOPE.md)
- [Architecture](ARCHITECTURE.md)
- [Modèle de données](DATA_MODEL.md)
- [Feuille de route](ROADMAP.md)
- [Décisions](DECISIONS.md)
- [Moteur pédagogique](PEDAGOGICAL_ENGINE.md)
- [Sécurité et limites](SECURITY_AND_LIMITS.md)
# Étape 5 — placement manuel des impacts

L’étape 5 ajoute une cible numérique simplifiée et la saisie manuelle d’impacts rattachés exclusivement à une série. Une série active accepte l’ajout, la sélection, le déplacement, la suppression, l’annulation/rétablissement local et la confirmation. Une série terminée est consultable en lecture seule. Les séries planifiées ou annulées n’acceptent aucun impact.

Les coordonnées normalisées `(0..1, 0..1)` sont la source de vérité SQLite. Les coordonnées d’écran, le niveau de zoom et le déplacement de la vue ne sont jamais persistés. Les coordonnées physiques restent `NULL`, car les cibles du pilote n’ont pas encore de dimensions physiques fiables.

Le compteur distingue :

- `expectedShotCount` : coups prévus ;
- `recordedShotCount` : coups déclarés réellement tirés ;
- `impactCount` : impacts enregistrés.

Un écart est autorisé et conservé après confirmation explicite. Confirmer les impacts ne termine jamais automatiquement la série.

Validation locale :

```bash
npm install
npm test
npm run typecheck
npx expo-doctor
npm start
```

## Parcours téléphone de l’étape 6

1. Placer un impact au centre : décalage nul, dispersion indisponible.
2. Placer deux impacts symétriques : vérifier centre, largeur et diamètre.
3. Former un groupement horizontal, vertical puis compact.
4. Déplacer/supprimer un impact et vérifier le recalcul après confirmation.
5. Exclure puis réintégrer un impact et vérifier les comptages.
6. Avec cinq impacts, en éloigner fortement un : il peut être signalé mais reste
   visible et inclus.
7. Fermer puis rouvrir : les résultats restent identiques.
8. Vérifier l’absence de millimètres tant que la géométrie n’est pas vérifiée.

L’interface arrondit à l’entier le plus proche ; le calcul conserve sa précision.

## Étape 7 — comparaison factuelle

Une série terminée peut être comparée à la première série `reference` terminée
de la séance et à la série terminée immédiatement précédente. Le sens est
toujours `delta = série comparée − série de référence`. La vue affiche valeurs,
écarts, pourcentage lorsque calculable, stabilité, limites et fiabilité
géométrique. Elle ne produit ni cause, ni diagnostic, ni conseil.

Parcours téléphone :

1. achever une série de référence avec au moins cinq impacts ;
2. achever une seconde série ;
3. ouvrir cette seconde série puis **Comparer cette série** ;
4. choisir **référence** puis **précédente** ;
5. vérifier les numéros, comptages, limites, valeurs, deltas et synthèse ;
6. vérifier qu’une série terminée reste strictement en lecture seule ;
7. ajouter une troisième série et vérifier la chronologie dans
   **Évolution des séries**.

Avec une seule série terminée, l’application affiche que la comparaison est
indisponible. Les séries planifiées, actives et annulées ne sont jamais proposées.

## Étape 8 — observations factuelles structurées

Le moteur `shooting-observation-v1` transforme les mesures et comparaisons en
codes structurés, sans cause technique ni conseil. Le détail d’une série
terminée affiche une observation principale, jusqu’à trois secondaires, la
confiance factuelle, les limites et « Pourquoi cette observation ? ». L’écran
de comparaison affiche « Ce qui a changé » et la séance les répétitions simples.

Parcours téléphone :

1. achever une série de cinq impacts centrés et resserrés ;
2. ouvrir son détail et vérifier « Observations » ;
3. déplier « Pourquoi cette observation ? » ;
4. vérifier que « Voir les impacts » est strictement en lecture seule ;
5. achever une série décentrée et dispersée ;
6. ouvrir sa comparaison et vérifier « Ce qui a changé » ;
7. achever une troisième série présentant la même direction de décalage ;
8. revenir à la séance et vérifier les observations répétées.

Les valeurs normalisées sont provisoires. La saisie manuelle et la géométrie
non vérifiée limitent actuellement la confiance.
# Étape 9 — Hypothèses techniques prudentes

L’application transforme désormais les observations factuelles de l’étape 8 en causes possibles à vérifier. Le résultat n’est jamais un diagnostic : une principale et jusqu’à trois alternatives sont classées par règles explicites, avec indices renforçants, indices affaiblissants et informations manquantes séparés.

La cible seule ne permet pas d’identifier avec certitude l’origine du résultat. Avec des impacts placés manuellement, la confiance reste `very_low` ou `low`. Aucun conseil, correction ou exercice n’est produit.
# Étape 10 — première couche d’action pédagogique

La chaîne métier est désormais :

`impacts → mesures → comparaisons → observations → hypothèses → test → résultat → recommandation/exercice → série de contrôle`.

Une recommandation n’est jamais produite depuis la seule position des impacts. Elle exige une hypothèse principale structurée et un résultat de test qui la soutient. Le cycle conserve une seule priorité, un objectif, une consigne, un exercice et une série de contrôle.

## Catalogue livré

- 12 tests : stabilité du guidon à sec, placement du doigt, anticipation à sec, constance de prise, retour en ligne, focalisation, durée de visée, pointage naturel, série lente, cadence régulière, alternance réelle/inerte supervisée et vérification de configuration.

## Étape 11 — consolidation du MVP

Le premier cycle complet est maintenant auditable de bout en bout : impacts,
mesures, comparaisons, observations, hypothèses, test, recommandation, exercice,
série de contrôle et évaluation ciblée.

La consolidation ajoute :

- 12 scénarios synthétiques A à L dans un compartiment de démonstration ;
- une mention permanente `Mode démonstration — données simulées` ;
- un journal de raisonnement versionné ;
- un rapport de séance JSON local et une sauvegarde JSON complète ;
- des retours structurés tireur et instructeur ;
- un avis humain conservé séparément de la sortie automatique ;
- des signalements locaux exportables ;
- des audits automatiques de prudence et de sécurité ;
- une page permanente `Sécurité et limites` ;
- les documents `MVP_VALIDATION_CHECKLIST.md` et `FIELD_TEST_PROTOCOL.md`.

La sauvegarde v13 exporte toutes les tables du schéma, y compris le nombre de
mains de chaque séance, porte sa version de base et une empreinte SHA-256
vérifiable. Les sauvegardes complètes v12 restent acceptées et leurs séances
sont préparées avec un nombre de mains `NULL`, sans valeur inventée. La lignée
historique ne contient toutefois aucun écran de réinsertion : seul un plan
prudent sans écrasement et la normalisation de compatibilité sont définis.
- 7 recommandations : détente, anticipation, tenue, visée, position, cadence, matériel.
- 8 exercices : départs à sec, série lente, maintien après départ, prise constante, retour en ligne, cadence régulière, pointage naturel, contrôle matériel.

Le MVP limite une série corrective à cinq coups, prévoit des pauses et ne boucle pas automatiquement.

## Exécution

```bash
npm install
npm test
npm run typecheck
npx expo-doctor
npx expo start --clear
```

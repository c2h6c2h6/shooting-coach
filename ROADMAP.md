# Feuille de route

Chaque étape se termine par une démonstration, des tests et une validation.

1. **Socle et profil** — squelette, navigation, types, formulaire et latéralité.
2. **Persistance locale** — SQLite, migrations, CRUD et sélection d’un profil. **Terminé.**
3. **Création/configuration d’une séance** — mode, arme, distance, cible,
   snapshot, brouillon et démarrage. **Terminé, sous réserve du test SQLite natif.**
4. **Gestion des séries** — types, ordre, contexte, intention et reprise hors
   ligne. **Terminé, sous réserve du test SQLite natif.**
5. **Impacts manuels sans photo** — repère cible et placement/correction par série. **Terminé.**
6. **Mesures géométriques** — neuf mesures, formules, fixtures et affichage factuel. **Terminé, sous réserve du test SQLite natif.**
7. **Comparaison** — évolution factuelle entre les séries. **Terminé, sous réserve du test SQLite natif.**
8. **Observations factuelles structurées** — catalogue, règles, confiance,
   conflits, persistance et affichage explicable. **Terminé, sous réserve du test SQLite natif.**
9. **Photo et calibration** — cible physique, captures, rôles, import/caméra,
   recadrage, perspective et échelle.
10. **Référentiels pédagogiques v1** — causes, indices et exercices validés.
11. **Moteur pédagogique v1** — quelques règles déterministes, journal de décision,
    incertitude et un seul prochain objectif.
12. **Résumé/historique** — séance, progression par compétence et export.
13. **Vue instructeur locale** — lecture sur le même appareil et export local.
14. **Comptes, rôles et synchronisation** — entité User et partage distant.
15. **Pilote fermé** — retours et corrections.
16. **Vision assistée** — détection/correction automatique avec validation humaine.

## Porte de validation actuelle

Étape 11 terminée : consolidation, audit, démonstration locale, journal,
exports, retours terrain et protocole du pilote. La porte suivante est une
validation humaine progressive : scénarios simulés, puis séances réelles
encadrées avec quelques tireurs et au moins un instructeur.

La photographie, la détection, la vidéo, le modèle de langage et toute
fonction distante restent reportés jusqu’à l’analyse des retours terrain.
# État après l’étape 5

Terminé : placement manuel sur cible numérique simplifiée, persistance par série, coordonnées normalisées, déplacement/suppression, annuler/rétablir local, navigation séparée, compteurs et confirmations d’écart.

Reporté : photographie, calibration, détection automatique, scoring,
comparaisons, observations, hypothèses, exercices et moteur pédagogique.

# État après l’étape 6

Terminé : conversions de coordonnées, mesures objectives, forme descriptive,
signal atypique prudent, exclusion humaine, versionnement, persistance,
recalcul et affichage factuel.

Reporté à ce stade : amélioration pédagogique/dégradation, scoring, photographie,
diagnostic, hypothèses, conseils, exercices et moteur pédagogique.

# État après l’étape 7

Terminé : comparaisons référence/précédente, compatibilité explicite, deltas
signés, pourcentages prudents, seuils de stabilité, fiabilité factuelle,
limitations d’effectif/exclusion, persistance, invalidation et chronologie de
séance.

Reporté : sélection manuelle libre dans l’interface, analyse pédagogique de
tendance, diagnostic, causes, conseils, exercices, photo, scoring et historique
global.

# État après l’étape 8

Terminé : 40 codes factuels, règles et seuils versionnés, magnitudes,
confiance, conflits/redondances, hiérarchisation, données insuffisantes,
comparaisons, répétitions intra-séance, persistance, invalidation, libellés
français et transparence.

Reporté : toute cause, diagnostic, conseil, exercice, adaptation pédagogique à
la latéralité, photo, détection, scoring et historique inter-séances.
# État

- Étape 9 : implémentée — génération et classement prudent d’hypothèses de causes.
- Étape suivante : tests de confirmation et/ou réponses pédagogiques, non développés dans cette livraison.
# État de la feuille de route

- Étape 10 : implémentée.
- Tests de confirmation, recommandations, exercices, cycle persistant, série corrective et évaluation ciblée sont inclus.
- Restent reportés : photographie, calibration, détection, vidéo, modèle de langage, synchronisation, comptes distants, partage instructeur, scoring, historique interséances, programme plurihebdomadaire, dégainé, déplacement, tir en mouvement et réglage détaillé d’arme.

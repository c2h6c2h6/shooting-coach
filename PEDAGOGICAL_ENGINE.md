# Moteur pédagogique

## Contrat

Entrée : contexte de séance, faits calculés, historique des séries, consigne
précédente et versions des référentiels.

Sortie structurée :

- observations factuelles;
- hypothèses compatibles avec score relatif;
- éléments renforçant/affaiblissant chaque hypothèse;
- niveau d’incertitude;
- facteur limitant proposé;
- une seule action suivante;
- règles déclenchées et explication;
- limite éventuelle demandant un instructeur.

## Pipeline

1. Valider le contexte.
2. Calculer les faits sans interprétation.
3. Comparer aux séries pertinentes.
4. Activer les hypothèses compatibles.
5. Appliquer les indices pondérés.
6. Mesurer l’ambiguïté entre hypothèses.
7. Choisir : observer, tester, corriger, consolider ou progresser.
8. Limiter la sortie à une priorité.
9. Enregistrer l’intégralité de la trace de décision.

## Garde-fous

- Aucune règle « cible → cause certaine ».
- Seuil minimal de données avant décision.
- Si plusieurs hypothèses restent proches : test diagnostique.
- Si deux séries correctives n’améliorent pas l’indicateur attendu : ne pas
  répéter automatiquement; réévaluer ou simplifier.
- Les textes affichés proviennent de gabarits ou d’une reformulation contrainte.
- Toute affirmation rappelle quand une observation directe est nécessaire.

## Format de référentiel envisagé

Chaque fichier porte `catalogVersion`, `schemaVersion`, un identifiant stable,
des conditions déclaratives, des paramètres et des clés de traduction. Le
moteur refuse un catalogue invalide ou incompatible.
# Boucle pédagogique v1

1. Retenir l’hypothèse principale.
2. Vérifier le contexte et les prérequis.
3. Sélectionner un test discriminant.
4. Enregistrer un résultat prudent.
5. Renforcer, affaiblir ou laisser non départagées les hypothèses.
6. Proposer au plus un objectif et une consigne.
7. Créer une série de contrôle de cinq coups.
8. Comparer uniquement les métriques liées à l’objectif.
9. Conclure : amélioré, stable, dégradé, mixte ou insuffisant.

Dispersion : rayon moyen, diamètre, largeur et hauteur. Centrage : distance du centre moyen. Les autres améliorations ne suffisent pas à déclarer le travail efficace.
## Auditabilité après l’étape 11

Chaque cycle peut produire une `ReasoningTrace` séparant :

- faits sources et versions d’algorithmes ;
- règles déclenchées et non déclenchées avec seuils ;
- observations retenues et écartées ;
- hypothèses candidates, renforcements, affaiblissements et contradictions ;
- justification du classement, du test et de la recommandation ;
- seules métriques autorisées pour l’évaluation de l’objectif.

Le mode simplifié montre le fait, l’hypothèse, la proposition, sa raison et la
prochaine action. Le détail expert conserve la trace complète. Aucun score
interne n’est converti en pourcentage de certitude.

# Journal des décisions

| ID | Statut | Décision | Motif |
|---|---|---|---|
| ADR-001 | Validée | React Native + Expo + TypeScript strict, iOS et Android | Une base commune et typée |
| ADR-002 | Validée | Architecture offline-first pendant la séance | Connectivité de stand incertaine |
| ADR-003 | Validée par le cahier des charges | Latéralité obligatoire | Analyse dépendante droitier/gaucher |
| ADR-004 | Validée par le cahier des charges | Moteur déterministe et versionné | Explicabilité et contrôle pédagogique |
| ADR-005 | Validée et implémentée | SQLite local dès l’étape 2 | Relations riches et historique multi-séries |
| ADR-006 | Validée | Coordonnées physiques en mm, origine au centre réel | Comparaison indépendante de la photo |
| ADR-007 | Validée | Pilote local avant comptes et synchronisation | Valider le cœur du produit d’abord |
| ADR-008 | Validée | Cible physique distincte de ses captures, rôle explicite par capture | Ne pas confondre support, image et série |
| ADR-009 | Validée | Chaque impact appartient explicitement à une série | Une photo cumulée ne prouve pas l’appartenance |
| ADR-010 | Validée | Précision absolue distincte de la dispersion interne | Éviter une métrique ambiguë |
| ADR-011 | Validée | Neuf mesures objectives prévues et testées sur coordonnées connues | Base factuelle vérifiable |
| ADR-012 | Validée | La latéralité produit des repères relatifs, jamais une cause certaine | La position n’est qu’un indice |
| ADR-013 | Validée | Les séries sont construites avant les impacts manuels | L’unité métier est la série |
| ADR-014 | Validée | User reste absent du pilote local ; ShooterProfile est autonome | Pas d’authentification prématurée |
| ADR-015 | Validée | Migrations SQLite séquentielles via `PRAGMA user_version` | Évolutions reproductibles |
| ADR-016 | Validée | Le premier profil créé devient actif automatiquement | Parcours local simple |
| ADR-017 | Remplacée par ADR-018 pour les profils avec séances | Supprimer le profil actif vide la sélection s’il ne possède aucune séance | Éviter une référence invalide |
| ADR-018 | Validée et implémentée | Un profil possédant une séance ne peut pas être supprimé | Préserver la référence et l’historique sans suppression logique prématurée |
| ADR-019 | Validée et implémentée | La séance conserve une référence courante et des snapshots obligatoires | Une modification future ne réécrit pas l’histoire |
| ADR-020 | Validée et implémentée | Distance en millimètres, entière, de 1 à 100 m | Cohérence du domaine et rejet des valeurs manifestement incohérentes |
| ADR-021 | Validée et implémentée | Armes et types de cibles sont de petits référentiels SQLite extensibles | Identifiants stables sans module de gestion complexe |
| ADR-022 | Validée et implémentée | L’arme principale est un défaut d’interface, pas une contrainte de séance | Autoriser une autre arme à chaque séance |
| ADR-023 | Validée et implémentée | Le démarrage est une transition explicite `draft` vers `active` | Distinguer configuration enregistrée et séance commencée |
| ADR-024 | Temporaire | La liste de compétences d’entraînement est statique et préfixée `TEMP_` | Préparer l’UX sans figer le futur référentiel pédagogique |
| ADR-025 | Validée et implémentée | Une série de référence automatique contient 5 coups | Valeur MVP configurable et non pédagogique |
| ADR-026 | Validée et implémentée | La série de référence est créée au démarrage du Coaching libre, jamais au brouillon | Ne pas conserver de séries pour des séances abandonnées |
| ADR-027 | Validée et implémentée | La création automatique est idempotente et transactionnelle avec le démarrage | Éviter les doublons et les séances actives incomplètes |
| ADR-028 | Validée et implémentée | Les séries utilisent `ON DELETE RESTRICT` vers la séance | Préserver l’historique et interdire une suppression implicite |
| ADR-029 | Validée et implémentée | L’ordre repose sur `sequence_number` avec unicité par séance | Ordre stable indépendant de la date |
| ADR-030 | Validée et implémentée | Une seule série active par séance, garantie par un index SQLite partiel | Invariant protégé même hors interface |
| ADR-031 | Validée et implémentée | Coups prévus de 1 à 50 ; coups réalisés de 0 à 50 sans obligation d’égalité | Conserver les écarts réels |
| ADR-032 | Validée et implémentée | Une séance ne peut être terminée avec une série active | Protection SQLite en attendant l’interface de fin de séance |

Les identifiants `TEMP_*` restent provisoires et remplaçables. Les impacts,
photographies, calculs et le moteur pédagogique restent hors du code de
l’étape 4.
# Décisions — étape 5

- Les coordonnées normalisées constituent l’unique source de vérité du MVP.
- Le zoom, le déplacement de vue, l’orientation et les dimensions du composant ne modifient jamais les coordonnées persistées.
- Les cibles sont génériques ; l’affichage FFTir est explicitement provisoire et sans scoring.
- Les coordonnées physiques restent `NULL` tant qu’aucune dimension fiable ou calibration n’existe.
- Les impacts utilisent `ON DELETE RESTRICT` vers `series`. Les séries sont annulées, pas supprimées, et une série contenant des impacts ne peut donc pas disparaître accidentellement.
- Le numéro suivant vaut `MAX(sequence_number) + 1`. Une suppression ne renumérote pas les impacts.
- La saisie est confirmée en bloc et transactionnellement. L’historique annuler/rétablir reste en mémoire.
- Le mode navigation est séparé des modes ajout et sélection afin qu’un zoom ou un déplacement de vue ne crée pas d’impact.
- Confirmer une saisie ne termine pas la série. Un écart entre coups prévus, déclarés et impacts demande confirmation mais reste autorisé.
- `source=manual`, `confidence=NULL` et coordonnées physiques `NULL` décrivent honnêtement les capacités présentes.

# Décisions — étape 6

- Algorithme `series-metrics-v1`; géométrie actuelle
  `unverified-normalized-v1`.
- Origine au centre ; X vers la droite, Y vers le haut. Y écran est inversé.
- Aucun millimètre sans largeur et hauteur fiables.
- Forme à partir de 3 impacts : compacte si les deux axes ≤10 % ; orientation
  si le rapport d’axes atteint 1,5. Seuils provisoires et versionnés.
- À partir de 5 impacts, signal atypique si distance au centroïde >2,5 fois la
  médiane. Aucun impact n’est automatiquement exclu.
- Les mesures persistées restent recalculables. Une impossibilité vaut `NULL`.
- Aucun diagnostic, cause, conseil, exercice ou comparaison n’est produit.

# Décisions — étape 7

- Algorithme `series-comparison-v1`, seuils `comparison-thresholds-v1`.
- Delta toujours égal à comparée moins référence.
- Comparabilité : même séance, arme, distance, type/version de cible et version
  de mesures ; deux statuts `completed` et au moins un impact inclus chacun.
- Seuils provisoires normalisés : centrage/rayon stable ≤1 %, notable ≥3 % ;
  dispersion stable ≤1,5 %, notable ≥5 %. Équivalents physiques préparés :
  2/5 mm et 3/8 mm.
- La saisie manuelle réduit actuellement la fiabilité à `limitée`, même avec
  de bons effectifs. Ce niveau décrit la solidité géométrique, jamais une cause.
- Un écart d’effectif n’interdit pas la comparaison ; ≥40 % limite les
  conclusions de dispersion. Aucun impact n’est retiré pour égaliser.
- Les exclusions restent visibles. La comparaison officielle porte sur les
  impacts inclus ; la vue « tous impacts » est reportée.
- Les comparaisons sont persistées mais recalculables et invalidées
  automatiquement à tout changement des mesures.

# Décisions — étape 8

- Une série `completed` est immuable dans l’interface, le repository et SQLite.
  Aucune réouverture n’est créée.
- Algorithme `shooting-observation-v1`, règles `observation-rules-v1`, seuils
  `observation-thresholds-v1`.
- Seuils normalisés provisoires : centré ≤2,5 %, diagonale si chaque composante
  atteint 3,5 %, compact si chaque axe ≤10 %, large si un axe ≥25 % ou diamètre
  ≥30 %, orientation si rapport d’axes ≥1,5.
- Forme robuste à partir de 5 impacts. Avec moins de 3, aucune classification
  robuste de forme.
- Magnitude du décalage : faible avant 7 %, modérée avant 14 %, marquée au-delà.
- La saisie manuelle limite la confiance à faible ou moyenne, jamais élevée.
- Une combinaison ne supprime pas les observations élémentaires. Une diagonale
  principale supprime les directions redondantes.
- Une principale, trois secondaires au maximum et des limitations séparées.
- Les répétitions restent intra-séance et n’impliquent aucune habitude technique.
# Décisions — étape 9

- `high` en plausibilité signifie seulement « actuellement la plus compatible ».
- Aucune hypothèse n’a le statut `confirmed`.
- La confiance est plafonnée à `low` avec la géométrie manuelle actuelle.
- Le score interne n’est jamais présenté comme une probabilité.
- La latéralité module uniquement certaines relations causales ; elle ne modifie jamais l’observation.
- `CENTERED_AND_COMPACT` ne produit aucune cause négative.
- Un test de confirmation est un besoin futur structuré, pas un exercice exécuté.
# Décisions étape 10

- Une recommandation exige une hypothèse principale suffisamment soutenue et un test favorable ; un test non concluant ne produit aucun travail personnalisé.
- Un seul objectif est actif par cycle.
- Le choix du test privilégie l’applicabilité, la sécurité, le caractère discriminant puis l’alternative sans tir réel.
- Le test utilisant une munition inerte exige autorisation, procédure connue et instructeur ; aucun chargement secret hors cadre supervisé.
- Aucun ratio universel de pression entre les mains ni placement universel du doigt n’est présenté comme une vérité.
- Un exercice débutant conserve une seule consigne et au plus cinq coups ; aucun programme à volume élevé n’est généré.
- L’amélioration est formulée comme compatible avec un effet positif, jamais comme preuve définitive de la cause.
- Le matériel peut être vérifié mais l’application ne guide aucune modification ou suppression d’un dispositif de sécurité.
## Étape 11 — décisions de consolidation

- Le catalogue réel comporte 12 tests de confirmation ; le nombre est verrouillé par test.
- Une démonstration n’écrit jamais dans l’historique des séances réelles.
- Le journal détaillé est destiné à l’audit ; l’utilisateur reçoit une synthèse.
- La sortie du moteur et l’avis humain sont immuables et conservés séparément.
- Aucun rapport, retour ou signalement n’est envoyé automatiquement.
- Le JSON est le format d’export obligatoire du MVP.
- La restauration destructive est désactivée pendant le pilote : validation,
  sauvegarde préalable et import comme copie sont exigés.
- Une amélioration de contrôle appelle une vérification de reproductibilité ;
  une dégradation arrête l’exercice et interdit une boucle automatique.

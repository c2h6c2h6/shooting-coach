# Chargeur de référentiels pédagogiques v2 — Étape 2

## Objet et périmètre

Cette étape ajoute un chargeur générique, déterministe et sans effet de bord pour les futurs fichiers de référentiel pédagogique v2. Il reçoit en mémoire des valeurs `unknown`, les valide, résout leurs références et produit soit un catalogue entièrement cohérent, soit une liste structurée de diagnostics.

Le chargeur ne lit ni n'écrit SQLite, ne connaît ni React Native ni Expo, n'est importé par aucun écran ou moteur et ne modifie aucune donnée v1. Il ne contient aucun catalogue réel, aucune compétence A–J, aucun exercice réel et aucune taxonomie pédagogique nouvelle.

## Format générique des fichiers

Chaque fichier porte uniquement :

- `kind` : `competences`, `techniques`, `tools` ou `exercises` ;
- `schemaVersion` ;
- `catalogVersion` ;
- `items` : les fiches versionnées correspondantes.

Chaque fiche doit elle-même conserver son `id`, son `code`, son `schemaVersion`, son `itemVersion` et son `catalogVersion`. La version de schéma supportée est celle des contrats v2 de l'étape 1 : `pedagogical-v2-contracts-v1`.

Le chargeur n'impose aucun ordre aux fichiers ni aux fiches. Sa sortie est triée par identifiant afin qu'un même contenu produise exactement le même catalogue résolu indépendamment de son ordre d'entrée.

## Compétences et graphe

`CompetenceDefinition` représente la fiche source. Elle omet volontairement `dependentCompetenceIds`.

Le chargement suit cet ordre logique :

1. validation des conteneurs et versions ;
2. validation individuelle des fiches ;
3. contrôle global des identifiants et codes ;
4. résolution de toutes les références ;
5. détection des cycles de prérequis ;
6. dérivation inverse des compétences dépendantes ;
7. production du catalogue immuable résolu.

Si une fiche source fournit `dependentCompetenceIds`, elle est refusée. Le graphe des `prerequisiteIds` reste ainsi l'unique source de vérité.

## Références contrôlées

Le chargeur vérifie :

- les prérequis de chaque compétence ;
- les outils pédagogiques associés à chaque compétence lorsqu'ils sont présents ;
- les compétences et outils compatibles de chaque technique ;
- la compétence principale, les compétences secondaires et les prérequis de chaque exercice ;
- les techniques et outils utilisés par chaque exercice.

Un identifiant ou un code doit être unique dans l'ensemble du catalogue, y compris entre catégories de fiches. Une référence absente invalide l'intégralité du chargement : aucun catalogue partiel n'est retourné.

## Exercices et variables

Les schémas de l'étape 1 continuent de garantir :

- exactement une compétence principale scalaire ;
- l'absence de cette compétence parmi les secondaires ;
- des critères de réussite et d'arrêt ;
- exactement les douze variables pédagogiques contractuelles ;
- uniquement des clés modifiables connues.

Les valeurs métier des variables restent ouvertes. Le chargeur ne crée aucune taxonomie de cadence, déplacement, charge attentionnelle, complexité ou supervision.

## Diagnostics

`loadPedagogicalCatalog` ne lève pas d'exception. Il retourne un résultat discriminé contenant tous les diagnostics détectés. Chaque diagnostic fournit :

- un code stable ;
- l'index du fichier ;
- le chemin précis du champ ;
- un message lisible ;
- l'identifiant de la fiche lorsqu'il est disponible.

Codes disponibles :

- `INVALID_FILE` ;
- `INCOMPATIBLE_SCHEMA_VERSION` ;
- `MISSING_CATALOG_VERSION` ;
- `CATALOG_VERSION_MISMATCH` ;
- `INVALID_ITEM` ;
- `ITEM_SCHEMA_VERSION_MISMATCH` ;
- `ITEM_CATALOG_VERSION_MISMATCH` ;
- `DUPLICATE_ID` ;
- `DUPLICATE_CODE` ;
- `BROKEN_REFERENCE` ;
- `PREREQUISITE_CYCLE`.

`parsePedagogicalCatalog` fournit une variante stricte qui lève une unique `PedagogicalCatalogValidationError` contenant le diagnostic agrégé lisible.

## Tests synthétiques

Toutes les fixtures portent explicitement les préfixes `TEST/FIXTURE` ou `TEST-FIXTURE`. Elles ne décrivent aucune compétence, technique, relation ou exercice réel.

La certification couvre : catalogue valide, versions incompatibles ou absentes, doublons d'identifiant et de code, références cassées, cycles directs et indirects, compétence principale dupliquée, technique/outils/compétences inexistants, variables inconnues, dérivation des dépendances, diagnostic agrégé et indépendance à l'ordre des fichiers.

## Snapshot historique

La décision d'architecture est enregistrée pour les étapes futures : tout snapshot historique minimal conservera `catalogVersion`, `itemId`, `itemVersion`, `code`, `displayName` et les paramètres effectifs utilisés. Aucun objet de décision, aucune persistance et aucun snapshot historique ne sont créés pendant cette étape 2.

## Non-régression

Le chargeur est fonctionnellement orphelin : aucun module actif du MVP ne l'importe. Les migrations restent en version 12, l'export v12 reste inchangé, le moteur v1 demeure seul actif et les scénarios A–L conservent leurs sorties historiques, y compris les legacy known deviations E, H, I et J.

## Arrêt

Cette étape s'arrête avant l'intégration de tout contenu réel. Le catalogue A–D, le moteur v2, la persistance, les décisions pédagogiques et toute interface nécessitent une autorisation distincte.

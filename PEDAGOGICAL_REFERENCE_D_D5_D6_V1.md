# Référentiel pédagogique D5/D6 v1

## Identité et portée

- `catalogVersion` : `pedagogical-reference-d-v1`
- `schemaVersion` : `pedagogical-v2-contracts-v1`
- `itemVersion` : `1.0.0` pour D5 et D6
- domaine : D — Détente
- validation : `instructor`
- statut : contenu métier réel v2, chargé mais fonctionnellement inactif

Ce lot ajoute exactement D5 et D6 au catalogue existant. Il ne crée aucune technique, aucun exercice, aucun test diagnostique et aucune donnée de maîtrise.

## D5 — Poursuivre l’action sur la détente jusqu’à la butée

### Identité

- ID : `competence-d5`
- code : `D5`
- prérequis direct : `competence-d4`
- `prerequisiteIds` : `["competence-d4"]`

D3 reste un prérequis transitif via D4.

### Définition

Le tireur poursuit l’action exercée sur la détente après le départ du coup jusqu’à atteindre la butée mécanique, sans relâchement prématuré provoqué par le départ.

### Objectif pédagogique

Construire une action dans laquelle le départ du coup ne provoque pas l’arrêt ou le relâchement de l’action sur la détente, celle-ci étant poursuivie jusqu’à la butée mécanique.

### Doctrine

Le départ du coup ne termine pas l’action sur la détente.

### Indicateurs observables

1. L’action sur la détente se poursuit après le départ jusqu’à la butée mécanique.
2. Aucun relâchement immédiat de la détente n’apparaît au moment du départ.
3. La butée est atteinte avant tout éventuel retour de la détente.
4. Le tireur peut maintenir la détente à la butée pendant la phase d’observation et de décision.

### Indicateurs indirects

1. Relâchement de la détente immédiatement après le départ.
2. Retour de la détente engagé avant que la butée ait été clairement atteinte.
3. Amélioration lorsque la consigne porte uniquement sur la poursuite de l’action jusqu’à la butée.

### Limites d’interprétation

1. Un relâchement prématuré après le départ ne permet pas, à lui seul, d’identifier la cause de ce comportement.
2. D5 décrit la poursuite de l’action jusqu’à la butée ; elle ne décrit pas le retour vers le reset.
3. Atteindre la butée ne signifie pas qu’il faut rechercher immédiatement le reset.
4. D5 ne définit ni une cadence de tir ni une vitesse imposée après le départ.

## D6 — Revenir au reset de manière contrôlée lorsqu’une nouvelle action est nécessaire

### Identité

- ID : `competence-d6`
- code : `D6`
- prérequis direct : `competence-d5`
- `prerequisiteIds` : `["competence-d5"]`

D4 et D3 restent des prérequis transitifs.

### Définition

Lorsque la décision de poursuivre impose une nouvelle action sur la détente, le tireur effectue depuis la butée un retour contrôlé jusqu’au point de reset permettant le réengagement de l’action, sans relâchement excessif ni désorganisation.

### Objectif pédagogique

Construire un retour depuis la butée vers le reset qui rende possible une nouvelle action sur la détente tout en conservant l’organisation du geste et sans faire de la vitesse ou de la recherche du clic une finalité.

### Doctrine

- Le reset est conditionnel à une nouvelle action.
- Le reset n’est pas une recherche de vitesse.
- Éviter l’obsession du clic.
- Le tempo de l’action allant du point dur vers la butée et le tempo du retour de la butée vers le reset peuvent être travaillés comme une référence qualitative comparable.
- Il ne s’agit pas d’une égalité chronométrique universelle, mais d’une référence pédagogique de qualité et de continuité du geste.

### Indicateurs observables

1. Le retour vers le reset n’est engagé que lorsqu’une nouvelle action sur la détente est nécessaire.
2. Le retour depuis la butée est contrôlé jusqu’au point permettant le réengagement de l’action.
3. Le tireur n’effectue pas de relâchement excessif au-delà de ce qui est nécessaire au reset.
4. Une nouvelle action peut être engagée après le reset sans désorganisation observable.
5. Le comportement est reproductible sur plusieurs cycles comparables.

### Indicateurs indirects

1. Relâchement immédiat et automatique après chaque départ, indépendamment de la décision de poursuivre.
2. Recherche volontaire du clic de reset au détriment de l’organisation du geste.
3. Relâchement excessif de la détente avant la nouvelle action.
4. Amélioration lorsque le retour depuis la butée est volontairement contrôlé.

### Limites d’interprétation

1. Le reset n’est nécessaire que lorsqu’une nouvelle action sur la détente doit suivre.
2. D6 ne doit pas être évaluée comme une recherche de vitesse.
3. La perception ou l’audition du clic de reset ne constitue pas, à elle seule, un critère de maîtrise de D6.
4. La référence à un tempo comparable entre l’aller et le retour est un outil pédagogique d’acquisition et non une exigence chronométrique universelle.
5. D6 décrit le retour contrôlé vers le reset ; elle ne remplace pas D5, qui concerne la poursuite préalable jusqu’à la butée.

## Graphe de prérequis

Le graphe direct est :

`D3 → D4 → D5 → D6`

Les dépendances sont dérivées par le loader à partir des seuls `prerequisiteIds`. Aucun `dependentCompetenceIds` n’est encodé dans le fichier source.

## Frontières D4 / D5 / D6

- D4 : comment la pression évolue avant le départ.
- D5 : l’action est-elle poursuivie jusqu’à la butée après le départ ?
- D6 : lorsqu’une nouvelle action est nécessaire, le retour depuis la butée vers le reset est-il contrôlé ?

Ces trois compétences restent distinctes.

## Champs optionnels volontairement absents

D5 et D6 ne définissent pas :

- `pedagogicalToolIds` ;
- `pedagogicalSupportNotes` ;
- `internalComponents` ;
- `referenceStatements`.

Les doctrines restent documentaires.

## Éléments explicitement hors périmètre

- technique D5, D6 ou mutualisée ;
- Drill d’échec ;
- `ExerciseDefinition` D5 ou D6 ;
- `DiagnosticTestDefinition` D5 ou D6 ;
- nouveau code d’incertitude ;
- `CompetenceEvaluation`, `PedagogicalDecision` ou `MasteryEvent` réel ;
- D1, D2 ou E1 ;
- persistance, migration, interface ou activation du moteur v2.

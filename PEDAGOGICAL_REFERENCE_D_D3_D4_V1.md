# Référentiel pédagogique D v1 — socle D3/D4

## Identité et portée

- `catalogVersion` : `pedagogical-reference-d-v1`
- `schemaVersion` : `pedagogical-v2-contracts-v1`
- `itemVersion` : `1.0.0` pour D3 et D4
- domaine : D — Détente
- statut : mini-référentiel métier réel v2, fonctionnellement inactif

Ce document conserve le contenu autoritatif de D3 et D4. D4 dépend directement de D3.

Le catalogue `pedagogical-reference-d-v1` contient désormais également D5 et D6, documentées séparément dans `PEDAGOGICAL_REFERENCE_D_D5_D6_V1.md`. Le contenu D3/D4 ci-dessous reste inchangé.

## D3 — Maintenir une action continue sur la détente

### Identité

- ID : `competence-d3`
- code : `D3`
- domaine : D — Détente
- validation : `instructor`
- prérequis : aucun (`prerequisiteIds: []`)

### Définition

Le tireur exerce une action sur la détente qui se poursuit sans interruption volontaire, relâchement parasite ni succession de reprises jusqu’au départ du coup. La continuité décrit l’absence de rupture dans l’action ; elle ne définit ni sa vitesse ni sa progressivité.

### Objectif pédagogique

Construire une action de détente dans laquelle, une fois la pression volontairement engagée, celle-ci se poursuit sans succession pression–arrêt–reprise jusqu’au départ du coup.

### Doctrine

La continuité signifie que l’action ne s’interrompt pas ; elle ne signifie ni lenteur obligatoire ni vitesse imposée.

### Indicateurs observables

1. Mouvement de l’index continu jusqu’au départ.
2. Absence de relâchement pendant l’action engagée.
3. Absence de succession répétée pression–arrêt–reprise.
4. Départ du coup survenant pendant une action déjà engagée.
5. Capacité à reproduire cette continuité sur plusieurs actions comparables.

### Indicateurs indirects

1. Action qui commence puis s’interrompt lorsque l’image de visée oscille.
2. Petites reprises successives de pression.
3. Temps de départ très variable dans des conditions comparables.
4. Amélioration lorsque la consigne est uniquement de poursuivre l’action.
5. Amélioration lors d’un guidage pédagogique de l’action.

### Limites d’interprétation

- Une action discontinue ne permet pas, à elle seule, d’identifier sa cause.
- Elle peut notamment être associée à une recherche excessive de stabilité ou de perfection visuelle, à une difficulté d’acceptation du départ, à une co-contraction de la main forte, à la fatigue ou à une mauvaise compréhension de la consigne.
- D3 décrit la rupture de l’action, pas pourquoi cette rupture existe.
- La position des impacts en cible ne permet pas, à elle seule, de diagnostiquer D3.
- Ne pas confondre D3 avec D4 : une action peut être continue mais brutalement accélérée.

### Outils associés

- `INSTRUCTOR_TACTILE_FEEDBACK`
- `OBSERVATION_VIDEO`

Ces outils conservent les identifiants, codes, noms et définitions autoritatifs déjà utilisés par le référentiel A/B. Leur `catalogVersion` est snapshotée pour le mini-référentiel autonome D, conformément au fonctionnement actuel du chargeur. Aucun nouvel outil sémantique n’est créé.

## D4 — Construire une pression progressive sur la détente

### Identité

- ID : `competence-d4`
- code : `D4`
- domaine : D — Détente
- validation : `instructor`
- prérequis direct : `competence-d3`
- `prerequisiteIds` : `["competence-d3"]`

### Définition

Le tireur fait évoluer la pression exercée sur la détente de manière progressive et maîtrisée jusqu’au départ du coup, sans accélération terminale brusque destinée à provoquer volontairement l’instant du départ.

### Objectif pédagogique

Construire une action dans laquelle le départ du coup survient au cours d’une montée de pression déjà engagée, et non à la suite d’une action terminale brusque du doigt.

### Doctrine

Progressif ne signifie pas lent.

Le ralentissement peut être utilisé pour apprendre ou observer D4.

Le ralentissement n’est pas la compétence.

Une action rapide peut être progressive.

### Indicateurs observables directs

1. Augmentation de l’action sur la détente sans accélération terminale brusque.
2. Mouvement de l’index dont le comportement reste cohérent jusqu’au départ.
3. Reproductibilité de cette organisation sur plusieurs actions comparables.

### Indicateurs indirects

1. Perturbation de l’arme synchronisée avec une accélération terminale visible.
2. Dégradation apparaissant lorsque le tireur cherche volontairement à provoquer le départ.
3. Amélioration lorsque la montée en pression est volontairement ralentie.
4. Différence nette entre une action guidée et l’action autonome.

### Limites d’interprétation

- Une perturbation de l’arme au départ ne suffit pas à diagnostiquer D4.
- Une perturbation peut notamment être compatible avec :
  - D2 — direction de pression ;
  - B5 — co-contraction de la main forte ;
  - E1 — réponse anticipatrice ;
  - D4 ;
  - ou une combinaison.
- Cette liste est une limite textuelle. Elle ne crée aucune compétence ni relation métier supplémentaire.
- La position des impacts en cible ne permet jamais, à elle seule, de valider ou invalider D4.
- Le terme “coup de doigt” ne constitue pas un diagnostic technique suffisamment précis du moteur.

## Frontières D3 / D4

- D3 : « L’action s’interrompt-elle ? »
- D4 : « Comment l’intensité de la pression évolue-t-elle ? »

Invariant : une action peut être continue mais non progressive.

## Éléments explicitement hors du périmètre D3/D4

Le mini-référentiel de compétences ne contient pas :

- d’autre `DiagnosticTest` réel que `TEST-D4-01`, documenté séparément dans `PEDAGOGICAL_DIAGNOSTIC_TEST_D4_01_V1.md` ;
- d’autre `PedagogicalTechnique` réelle que `TECH-D4-01`, documentée séparément dans `PEDAGOGICAL_TECHNIQUE_D4_01_V1.md` ;
- Guidage tactile de l’index comme nouvelle technique ;
- aucun autre exercice réel que `EX-D4-01`, documenté séparément dans `PEDAGOGICAL_EXERCISE_D4_01_V1.md` ;
- mastery spécifique D3 ou D4 ;
- `MasteryEvent` réel ;
- `PedagogicalDecision` réel ;
- `ShooterSelfReport` réel ;
- variable spécifique D ;
- D1, D2 ou E1 ;
- domaine D complet ;
- persistance, migration, interface ou activation du moteur v2.

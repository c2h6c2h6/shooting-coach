# EX-D4-01 — Construire la montée de pression

## Identité et version

- `id` : `exercise-d4-01`
- `code` : `EX-D4-01`
- `name` : Construire la montée de pression
- `schemaVersion` : `pedagogical-v2-contracts-v1`
- `itemVersion` : `1.0.0`
- `catalogVersion` : `pedagogical-reference-d-v1`

## Compétences

- Compétence principale : `competence-d4`
- Compétences secondaires : aucune (`[]`)
- Prérequis : `competence-d3`

D3 est un prérequis de EX-D4-01, pas une compétence secondaire.

L’exercice ne possède qu’une seule compétence principale : D4.

## Technique pédagogique

- `pedagogicalTechniqueIds` : `technique-d4-01`

TEST-D4-01, TECH-D4-01 et EX-D4-01 restent trois objets distincts. Leur présence dans le même référentiel ne crée aucun déclenchement automatique.

## Phase d’apprentissage

- `learningPhase` : `acquisition`

## Objectif pédagogique

Produire plusieurs actions progressives et reproductibles dans une situation simplifiée, sans contrainte temporelle ajoutée.

## Raison d’existence

Isoler la progressivité de l’action sur la détente dans une situation volontairement simplifiée, sans contrainte temporelle ajoutée, afin de permettre au tireur de construire et à l’instructeur d’observer une montée de pression sans accélération terminale brusque.

## Modes, supervision et équipement

- `modeCodes` : `[]`
- `instructorRequired` : `true`
- `technicalEquipmentCodes` : `[]`

La validation de l’exercice reste instructeur. Aucune validation automatique n’est définie.

## Protocole

1. L’instructeur place l’exercice dans une situation simplifiée compatible avec les conditions d’entraînement et de sécurité établies.
2. Le tireur applique la consigne : « Fais monter la pression jusqu’au départ, sans action brusque finale. »
3. L’instructeur observe prioritairement l’évolution de l’action sur la détente, sans ajouter de contrainte temporelle.
4. L’action est répétée suffisamment pour permettre à l’instructeur d’apprécier si le comportement observé est reproductible et non accidentel.

## Instruction

« Fais monter la pression jusqu’au départ, sans action brusque finale. »

## Sensations recherchées

- Perception d’une pression qui augmente progressivement jusqu’au départ.
- Sensation que le départ survient pendant une action déjà engagée, sans action terminale brusque.
- Conservation de la qualité de l’action lorsque sa durée commence ensuite à être réduite.

## Erreurs fréquentes

- Accélération terminale brusque destinée à provoquer le départ.
- Transformer le ralentissement en objectif de lenteur.
- Interrompre puis reprendre l’action au lieu de conserver la continuité requise par D3.
- Modifier simultanément plusieurs éléments de l’action, rendant l’observation de D4 difficilement interprétable.

## Critère de réussite

- Le comportement doit être suffisamment répété pour permettre à l’instructeur de constater qu’il n’est pas accidentel.

Aucun seuil numérique, score ou nombre minimal arbitraire de répétitions n’est défini.

## Critères d’arrêt

- L’action n’est plus suffisamment continue pour permettre d’évaluer proprement D4.
- Les conditions ne permettent plus d’observer la progressivité de manière suffisamment fiable.
- Le ralentissement modifie l’action au point qu’elle n’est plus interprétable.
- L’instructeur décide d’interrompre l’exercice.

## Conditions de non-utilisation

- Lorsque D3 n’est pas suffisamment présente pour permettre de travailler la progressivité de l’action.
- Lorsque l’objectif pédagogique du moment ne concerne pas D4.
- Lorsque le ralentissement provoque une modification telle de l’action qu’elle n’est plus interprétable.
- Lorsque la répétition n’apporte plus d’information ou d’apprentissage utile.

## Outils pédagogiques

- `pedagogicalToolIds` : `[]`

Aucun outil pédagogique supplémentaire ne définit EX-D4-01 v1.

## Variables par défaut

```json
{
  "distance": null,
  "numberOfHands": null,
  "time": null,
  "cadence": null,
  "zoneSize": null,
  "targetType": null,
  "sightSystem": null,
  "shotCount": null,
  "movement": null,
  "attentionalLoad": null,
  "complexity": null,
  "supervision": "instructor"
}
```

Ces valeurs `null` signifient que l’identité de EX-D4-01 v1 n’est définie ni par une distance, une configuration de mains, un temps, une cadence, une zone, une cible, un système de visée, un nombre de tirs, un mouvement, une charge attentionnelle ou une complexité particulière.

## Variable modifiable

- `modifiableVariableKeys` : `["time"]`

La progression de EX-D4-01 peut réduire progressivement la durée de l’action sans modifier la qualité recherchée. Une modification de la durée ne crée pas une nouvelle compétence D4.

## Doctrines

« Progressif ne signifie pas lent. »

« Le ralentissement est un moyen pédagogique, pas la compétence. »

## Limites du périmètre

EX-D4-01 ne crée ni deuxième exercice, deuxième technique, deuxième test diagnostique, nouvelle compétence D, `CompetenceEvaluation`, `PedagogicalDecision`, `MasteryEvent`, `ShooterSelfReport`, moteur de sélection, persistance ou activation v2.

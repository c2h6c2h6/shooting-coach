# Hotfix UX sécurité — contexte hérité et validation globale

## Comportement

Le coaching conserve toutes les règles de sécurité existantes mais ne présente plus
une case à cocher par condition.

L’application possède déjà l’écran permanent « Sécurité et limites » ainsi qu’un rappel
sur l’accueil, mais pas d’écran d’acceptation générale imposé à chaque ouverture. Ce
hotfix n’ajoute pas ce chantier d’ouverture.

Lors de la première entrée dans le coaching d’une séance, les conditions générales
sont rappelées en lecture seule. Une seule action explicite confirme qu’elles sont
réunies. Le contexte est enregistré dans `session_safety_contexts`, mécanisme SQLite
v12 déjà présent, puis relu par `sessionId` lors des tests suivants.

Une nouvelle séance possède un autre `sessionId` et demande donc sa propre confirmation.

## Tests en tir réel

Lorsque le contexte de séance est confirmé et que le protocole ne comporte aucune
condition supplémentaire, le bouton « Commencer le test » est présenté directement.
La checklist générale n’est pas répétée.

## Travail à sec

Les conditions spécifiques restent visibles avant le lancement :

- arme déchargée vérifiée ;
- chargeur retiré ;
- chambre vérifiée visuellement et physiquement ;
- aucune munition réelle dans la zone.

Elles sont confirmées ensemble par une seule action. Elles ne sont pas persistées
comme état permanent de la séance : relancer ultérieurement un test à sec peut donc
exiger une nouvelle confirmation de l’état réel de l’arme.

Les conditions concernant un instructeur ou des munitions inertes ne sont demandées
que lorsqu’un protocole les exige. `safetyBlockers` reste l’autorité qui interdit le
démarrage tant que les prérequis applicables ne sont pas satisfaits.

## QA appareil

1. Terminer une série et choisir « Continuer avec le coach ».
2. Vérifier qu’une seule confirmation globale de séance est proposée.
3. Revenir au coaching pendant la même séance et vérifier que cette confirmation
   générale n’est pas redemandée.
4. Ouvrir un test réel sans exigence supplémentaire et vérifier l’accès direct au test.
5. Ouvrir un test à sec et vérifier les quatre rappels spécifiques.
6. Vérifier qu’un seul contrôle confirme le groupe et que le test reste bloqué avant cette action.
7. Quitter puis relancer un test à sec : vérifier que l’état ponctuel de l’arme doit être
   reconfirmé si le test recommence.

Question QA : l’utilisateur comprend-il les règles de sécurité sans administrer une
checklist répétitive ?

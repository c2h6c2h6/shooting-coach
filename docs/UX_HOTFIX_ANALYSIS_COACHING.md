# Hotfix UX — écran d’analyse et coaching

## Structure retenue

L’écran d’une série terminée suit désormais une lecture progressive :

1. `Synthèse de la série` : fait principal et éventuel impact isolé ;
2. `Pistes à vérifier` : une piste principale, sans diagnostic certain ;
3. `Comment vérifier ?` : série de confirmation lorsque le moteur existant la rend disponible ;
4. `Continuer avec le coach` : seule action visuellement dominante ;
5. `Autres pistes possibles` : une alternative visible, puis les suivantes repliées ;
6. `Pour mieux comprendre` : une question pertinente et quatre réponses exclusives ;
7. `Voir les mesures détaillées` : métriques techniques repliées ;
8. impacts, comparaison et pilote D4 en actions secondaires.

La liste et l’ordre produits par le moteur ne sont pas modifiés. La couche de présentation répartit seulement cette liste entre piste principale, première alternative et alternatives supplémentaires. Toutes restent consultables.

## Traductions de présentation

- `high` devient `Piste plausible` ;
- `medium` devient `Piste possible` ;
- `low` devient `Piste secondaire`.

Le niveau de preuve interne n’est plus répété dans chaque carte. La limite générale reste visible : la cible seule ne permet pas d’identifier avec certitude l’origine du résultat.

La confiance factuelle est formulée comme une consigne de lecture : `À interpréter avec prudence`, `Observation à confirmer` ou `Observation fondée sur les données disponibles`. Les valeurs internes restent inchangées.

## QA manuel

1. Terminer une série produisant plusieurs hypothèses.
2. Vérifier que la synthèse est comprise immédiatement.
3. Identifier la piste principale sans ouvrir de détail.
4. Vérifier que le bloc `Comment vérifier ?` explique la série de confirmation lorsqu’elle est disponible.
5. Ouvrir `Voir les autres pistes` et confirmer que toutes les hypothèses restantes sont présentes.
6. Sélectionner successivement les réponses de `Pour mieux comprendre` et vérifier leur comportement exclusif.
7. Vérifier que `Continuer avec le coach` domine visuellement les actions comparaison, impacts et pilote D4.

Question de validation : en moins de cinq secondes, l’utilisateur comprend-il ce qui a été observé, ce qu’il faut vérifier et quelle action effectuer ensuite ?

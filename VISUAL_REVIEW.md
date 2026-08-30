# Revue visuelle et test de la version actuelle

Cette revue précède l’étape 6. Elle ne modifie aucune règle métier et n’ajoute
ni photographie, ni calcul, ni comparaison, ni diagnostic.

## Ouvrir l’application sur un téléphone avec Expo Go

Prérequis : un ordinateur et le téléphone doivent être connectés au même réseau
Wi-Fi.

```bash
cd shooting-coach
npm install
npm test
npm run typecheck
npx expo-doctor
npx expo start
```

1. Installer **Expo Go** depuis l’App Store ou Google Play.
2. Scanner le QR code affiché par Expo :
   - sur iPhone, avec l’appareil photo ;
   - sur Android, depuis Expo Go.
3. Si le réseau local bloque la connexion, arrêter Expo avec `Ctrl+C`, puis
   essayer `npx expo start --tunnel`.

Expo Go est le moyen recommandé pour cette première revue. L’ordinateur doit
rester allumé et le serveur Expo doit continuer à fonctionner.

## Ouvrir dans un simulateur

### iPhone — macOS uniquement

Installer Xcode et un simulateur iOS, puis :

```bash
npx expo start
```

Appuyer sur `i`. `Shift+i` permet de choisir un simulateur précis.

### Android — macOS, Windows ou Linux

Installer Android Studio, créer puis démarrer un appareil virtuel, puis :

```bash
npx expo start
```

Appuyer sur `a`. `Shift+a` permet de choisir un appareil ou un émulateur.

## Version installable

Aucune version installable n’a été produite pendant cette revue : cela
nécessite une configuration EAS, un compte Expo et, sur iPhone, la gestion de
la signature et des appareils autorisés. Le chemin prévu pour une démonstration
partageable est une **distribution interne EAS**. Elle fournira un lien
d’installation, mais elle n’est pas nécessaire pour le test Expo Go.

Pour Android, une distribution directe utilise un fichier APK. Un fichier AAB
est destiné au Play Store et ne s’installe pas directement. Pour iPhone, une
distribution ad hoc exige que l’appareil de test soit enregistré.

## Écrans accessibles

1. Accueil ;
2. liste des profils ;
3. création d’un profil ;
4. modification d’un profil ;
5. configuration d’une séance ;
6. vérification de la séance ;
7. détail d’une séance ;
8. création d’une série ;
9. détail d’une série ;
10. placement ou consultation des impacts.

Il n’existe pas encore d’écran d’historique global des séances.

## Parcours complet à tester

1. Depuis l’accueil, choisir **Créer un profil tireur**.
2. Saisir un prénom ou pseudonyme, la latéralité, le niveau et l’arme.
3. Choisir **Créer le profil** : il devient le profil actif.
4. Depuis l’accueil, choisir **Nouvelle séance**.
5. Choisir le mode, l’arme, la distance et le type de cible.
6. En mode Entraînement, renseigner éventuellement un objectif.
7. Choisir **Vérifier la séance**, relire le récapitulatif, puis
   **Enregistrer le brouillon**.
8. Dans le détail, choisir **Démarrer la séance**.
9. En Coaching libre, vérifier qu’une seule série de référence de 5 coups
   apparaît. En Entraînement, choisir **Ajouter** et créer la série.
10. Ouvrir la série et choisir **Démarrer la série**.
11. Choisir **Saisir les impacts**.
12. Vérifier les trois compteurs, sélectionner le mode **Ajouter**, puis toucher
    la cible.
13. Passer en mode **Sélectionner/déplacer**, toucher un marqueur puis sa
    nouvelle position.
14. Tester **Annuler**, **Rétablir**, **Supprimer l’impact** et **Recentrer**.
15. Passer en mode **Naviguer**, tester le zoom et vérifier qu’aucun impact
    involontaire n’est créé.
16. Choisir **Confirmer la saisie**. En cas d’écart, vérifier que
    l’avertissement est compréhensible.
17. Revenir au détail, saisir le nombre de coups réellement tirés et terminer
    la série.
18. Fermer complètement l’application, la relancer et vérifier la conservation
    du profil, de la séance, de la série et des impacts.

## Données et confidentialité de cette démonstration

Toutes les données métier de cette version sont enregistrées dans SQLite sur
l’appareil : profils, séances, séries et impacts. Aucun compte distant, aucune
API métier, aucune synchronisation et aucun envoi de photographie ne sont
implémentés.

Le chargement du code par Expo Go exige une connexion au serveur Expo lancé sur
l’ordinateur. Cela ne transforme pas les données métier en données distantes :
elles restent dans la base locale de l’application sur le téléphone.

## Contrôles réalisés dans l’environnement de développement

- 64 tests sur 64 réussis ;
- typage TypeScript strict réussi ;
- démarrage du serveur Metro réussi ;
- aucune erreur applicative affichée au démarrage de Metro ;
- avertissement non bloquant : la variable `NO_COLOR` est ignorée car
  `FORCE_COLOR` est définie par l’environnement ;
- React Native DevTools ne peut pas ouvrir son interface Electron dans ce
  conteneur exécuté en tant que `root` ; Metro lui-même démarre ;
- `expo-doctor` non exécuté : `npx` tente d’écrire dans `/root/.npm`, chemin
  interdit dans cet environnement.

## Captures d’écran

Aucune capture authentique n’a pu être produite ici. L’environnement ne possède
pas de simulateur iOS/Android et le projet n’inclut pas les dépendances
nécessaires à un rendu web. Les captures devront être réalisées pendant le test
Expo Go ou sur un simulateur local.

## Retour ergonomique souhaité

- compréhension immédiate du bouton principal de chaque écran ;
- confort des espacements sur le téléphone utilisé ;
- lisibilité des statuts et des trois compteurs ;
- taille de la cible sans devoir faire défiler excessivement ;
- facilité de sélection des marqueurs de 34 px ;
- compréhension des trois modes Ajouter, Sélectionner/déplacer et Naviguer ;
- clarté des avertissements en cas d’écart ;
- risque de toucher la cible involontairement en manipulant le téléphone ;
- nombre d’actions nécessaires entre le démarrage de la séance et la
  confirmation des impacts.

## Éléments encore provisoires

- identité visuelle et nom définitifs ;
- cible générique, sans dimensions FFTir officielles ;
- zoom par boutons, sans pincement tactile ;
- absence d’historique global des séances ;
- libellés des types de séries, qui précèdent le moteur pédagogique ;
- compétences temporaires `TEMP_*` ;
- absence d’icônes et d’illustrations ;
- distribution installable.

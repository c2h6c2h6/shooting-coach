# Distribution de démonstration sur iPhone

Cette configuration produit une application autonome de démonstration. Elle
n'utilise ni Expo Go ni un serveur Metro après son installation. Elle ne
modifie aucune règle métier et ne commence pas l'étape 6.

## Solution retenue

Le profil EAS `preview` utilise une distribution interne iOS ad hoc :

- l'application est signée par Apple ;
- l'iPhone autorisé est inscrit dans le profil de provisionnement ;
- EAS fournit un lien et un QR code après la réussite de la build ;
- l'application fonctionne ensuite sans ordinateur allumé.

Le profil `preview-simulator` est réservé au simulateur iOS sur Mac. Son
fichier ne peut pas être installé sur un iPhone réel.

## Prérequis

1. Un ordinateur avec Node.js LTS et npm.
2. Une connexion Internet.
3. Un compte Expo gratuit : <https://expo.dev/signup>.
4. Un compte Apple inscrit au programme Apple Developer payant :
   <https://developer.apple.com/programs/>.
5. L'iPhone cible, Safari et l'identifiant Apple du titulaire du compte.
6. Le projet décompressé sur l'ordinateur.

EAS peut gérer les certificats et profils de provisionnement. À la première
build, accepter l'option proposée pour laisser Expo gérer les identifiants de
signature. Ne jamais transmettre un mot de passe ou un code de validation dans
un message : les saisir uniquement dans le terminal ou sur les pages
officielles Expo/Apple.

## Commandes, dans l'ordre

Depuis le dossier qui contient le projet :

```bash
cd shooting-coach
npm install
npm test
npm run typecheck
npx expo-doctor
npx expo config --type public
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest init
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

Précisions importantes :

- `eas init` relie le dossier à un projet Expo. Confirmer le nom proposé ou
  créer un nouveau projet. Cette commande ajoute normalement
  `expo.extra.eas.projectId` à `app.json` ; cette valeur est propre au compte
  Expo et ne doit pas être inventée à l'avance.
- `device:create` affiche une adresse ou un QR code. L'ouvrir sur l'iPhone avec
  Safari, suivre l'installation du profil temporaire demandée par Apple, puis
  revenir au terminal.
- Lors de la build, choisir l'équipe Apple correcte et autoriser EAS à créer ou
  gérer le certificat de distribution et le profil de provisionnement.
- Si l'iPhone est enregistré après la création d'un ancien profil, une nouvelle
  build est nécessaire pour l'inclure.

## Obtenir et partager le lien

À la fin de la commande de build, le terminal affiche :

- la page de la build ;
- un QR code ;
- un lien d'installation.

Si le terminal a été fermé :

```bash
npx eas-cli@latest build:list --platform ios --status finished --limit 1
```

Ouvrir la dernière build depuis l'adresse affichée. La page Expo contient le
bouton d'installation et le QR code. Le lien ne doit être ouvert que sur un
iPhone dont l'UDID figurait dans le profil au moment de la build.

## Installation sur l'iPhone

1. Ouvrir le lien EAS sur l'iPhone autorisé, ou scanner le QR code.
2. Toucher **Install** / **Installer**.
3. Confirmer l'installation iOS.
4. Attendre que l'icône **Coach Tir** apparaisse.
5. Ouvrir l'application.
6. Conserver le lien EAS pour une éventuelle réinstallation.

Le Mac et le serveur Expo peuvent être éteints après l'installation.

## Si la distribution ad hoc n'est pas possible

L'alternative est TestFlight. Elle requiert également le programme Apple
Developer, la création de l'application dans App Store Connect et une build
`production`, puis son envoi à TestFlight. Pour un seul iPhone de revue, la
distribution interne ad hoc est plus directe.

## Temps indicatif

- première configuration des comptes et de l'iPhone : 10 à 30 minutes ;
- attente et génération EAS : souvent 10 à 30 minutes, mais la file d'attente
  dépend du plan Expo et de la charge du service ;
- installation : 1 à 5 minutes.

Ces délais sont des estimations, pas une garantie.

## Limites de la démonstration

- seuls les iPhone inscrits dans le profil ad hoc peuvent l'installer ;
- l'ajout d'un nouvel iPhone impose généralement une nouvelle build ;
- la signature/provisioning Apple a une durée de validité limitée ;
- ce n'est pas une publication App Store ;
- les données SQLite restent propres à cette installation et ne sont pas
  synchronisées ;
- supprimer l'application supprime normalement ses données locales ;
- aucune photographie, analyse, comparaison ou fonctionnalité de l'étape 6
  n'est incluse ;
- la cible et certains éléments visuels restent provisoires, comme indiqué dans
  `VISUAL_REVIEW.md`.

## Contrôle de validation avant l'étape 6

Valider sur l'iPhone :

1. lancement autonome après extinction du serveur local ;
2. création et modification d'un profil ;
3. création et démarrage d'une séance ;
4. création, démarrage et fin d'une série ;
5. placement, déplacement, suppression et confirmation des impacts ;
6. fermeture complète puis réouverture de l'application ;
7. persistance locale des données ;
8. lisibilité et ergonomie générale.

L'étape 6 reste bloquée tant que cette build n'a pas été installée et validée.

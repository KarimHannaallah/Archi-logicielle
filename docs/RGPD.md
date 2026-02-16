# Conformite RGPD - Documentation

## 1. Donnees personnelles collectees

| Donnee | Finalite | Base legale |
|---|---|---|
| Email | Identification unique, login | Consentement |
| Nom | Personnalisation de l'interface | Consentement |
| Hash du mot de passe | Authentification securisee | Consentement |
| Date de creation | Transparence, tracabilite | Consentement |

Le mot de passe en clair **n'est jamais stocke**. Seul un hash irreversible (scrypt + salt aleatoire) est conserve.

## 2. Principe de minimisation (Art. 5(1)(c) RGPD)

Seules les donnees strictement necessaires au fonctionnement de l'application sont collectees :
- **Email** : identifiant unique pour le login
- **Nom** : affichage dans l'interface
- **Mot de passe** : securite du compte (stocke uniquement sous forme de hash)

Aucune donnee superflue n'est demandee (pas d'adresse, de telephone, de date de naissance, etc.).

## 3. Consentement (Art. 6(1)(a) et Art. 7 RGPD)

- Lors de l'inscription, l'utilisateur doit cocher une case de consentement explicite
- Le texte de consentement informe clairement sur :
  - Les donnees collectees (email, nom)
  - La finalite (utilisation de l'application)
  - Le droit de suppression a tout moment
- L'inscription est **impossible** sans consentement
- Le consentement est enregistre en base (`consent_given = true`)

## 4. Droits des personnes concernees

### 4.1 Droit d'acces (Art. 15 RGPD)

- **Endpoint** : `GET /auth/profile`
- **Frontend** : page Profil affichant toutes les donnees personnelles stockees
- L'utilisateur peut consulter : nom, email, date de creation, statut du consentement

### 4.2 Droit de rectification (Art. 16 RGPD)

- **Endpoint** : `PUT /auth/profile`
- **Frontend** : bouton "Edit Profile" sur la page Profil
- L'utilisateur peut modifier son nom et son email

### 4.3 Droit a l'effacement (Art. 17 RGPD)

- **Endpoint** : `DELETE /auth/profile`
- **Frontend** : bouton "Delete Account" avec confirmation
- La suppression est **immediate et irreversible**
- Toutes les donnees personnelles sont supprimees de la base de donnees

## 5. Securite des donnees (Art. 32 RGPD)

| Mesure | Implementation |
|---|---|
| Hachage des mots de passe | `scrypt` avec salt aleatoire (16 octets) |
| Tokens d'authentification | JWT avec expiration (24h) |
| Comparaison securisee | `crypto.timingSafeEqual` (prevention timing attacks) |
| CORS | Restriction des origines autorisees |
| Parametres SQL | Requetes parametrees (prevention injection SQL) |

## 6. Architecture et protection des donnees (Privacy by Design)

L'architecture Ports & Adapters garantit :
- **Isolation du domaine** : les regles metier sont independantes de l'infrastructure
- **Separation des donnees** : les utilisateurs et les todos sont geres par des repositories distincts
- **Injection de dependances** : les services sont construits par composition, facilitant le test et l'audit
- **Regles architecturales enforcees** : `dependency-cruiser` interdit les couplages non autorises

## 7. Contact et exercice des droits

Pour exercer vos droits (acces, rectification, effacement), vous pouvez :
1. Utiliser directement les fonctionnalites de l'application (page Profil)
2. Contacter l'equipe de developpement via le backlog du projet

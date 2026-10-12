# Golf de Marcilly — site internet

Site multipage du Golf de Marcilly (Marcilly-en-Villette, Loiret), hébergé sur GitHub Pages, avec un espace d'administration branché sur Supabase.

- **Site** : https://ziigmund84.github.io/marcilly/
- **Administration** : https://ziigmund84.github.io/marcilly/admin/

## Pages

| Page | Fichier | Contenu |
|---|---|---|
| Accueil | `index.html` | Photo plein cadre avec infos du jour (ouverture, météo, prochaine compétition), phrase d'accueil, vignettes des parcours en défilement horizontal, grande photo, famille, compétitions, actualités, restaurant, partenaires |
| Parcours | `parcours.html` | Les 4 parcours (45 trous), entraînement, météo, galerie |
| Tarifs | `tarifs.html` | Découverte, green fees, practice, location, abonnements |
| Enseignement | `enseignement.html` | École de golf, Label Sportif, cours adultes, pros, Académie |
| Restaurant | `restaurant.html` | La Bergerie : horaires, carte, menus de groupe, réceptions, demande de devis |
| Association | `association.html` | Calendrier des compétitions, départs/résultats, bureau, sponsors |
| Actualités | `actualites.html`, `article.html?slug=…` | Articles du club |
| Contact | `contact.html` | Coordonnées, horaires, plan, formulaire |
| Mentions légales | `mentions-legales.html` | |

## Administration

Connexion avec un compte Supabase Auth présent dans la table `marcilly_admins`
(actuellement : jerome.millier@yahoo.fr). Tout le contenu se modifie depuis l'admin :
actualités, compétitions, tarifs et carte du restaurant, textes des pages, parcours,
équipe, partenaires, galerie, infos pratiques (coordonnées, horaires, liens, bandeau d'annonce),
médiathèque et messages reçus (contact et devis).

**Ajouter un administrateur** : créer l'utilisateur dans Supabase (Authentication → Users), puis :

```sql
insert into public.marcilly_admins (user_id)
select id from auth.users where email = 'adresse@exemple.fr';
```

## Technique

- HTML/CSS/JS statique, sans étape de build.
- Animations : GSAP + ScrollTrigger, défilement fluide Lenis (accueil : `assets/js/home2.js` et `assets/css/home2.css`). Respecte « réduire les animations ».
- Données : Supabase, projet `harmonie-olivet`, tables préfixées `marcilly_`, bucket de stockage `marcilly-media`.
  Lecture publique, écriture réservée aux administrateurs (RLS). Les formulaires publics peuvent seulement *ajouter* un message.
- Météo : Open-Meteo (sans clé).
- Configuration publique : `assets/js/config.js`.

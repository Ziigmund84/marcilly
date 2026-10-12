/* Golf de Marcilly — configuration publique (clé "publishable" : lecture seule, protégée par RLS) */
window.MARCILLY = {
  SUPABASE_URL: 'https://kdcflcvufukagdjycwww.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkY2ZsY3Z1ZnVrYWdkanljd3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDU4NjYsImV4cCI6MjEwNzIyMTg2Nn0.LA6aAhb2ZxRs2Ck0qtpV2IcpqMhNxGGSLgSMLGKNdMg',
  MEDIA: 'https://kdcflcvufukagdjycwww.supabase.co/storage/v1/object/public/marcilly-media/',
  WEATHER: { lat: 47.77, lng: 2.03 },
  /* Valeurs par défaut, remplacées par celles de la base dès qu'elles sont chargées */
  defaults: {
    contact: { address1: '829 Domaine de la Plaine', address2: '45240 Marcilly-en-Villette', phone: '02 38 76 11 73', email: 'golf@marcilly.com' },
    hours: { weekdays: '8h30 – 19h00', saturday: '8h00 – 20h00', sunday: '8h00 – 20h00' },
    restaurant_hours: { weekdays: '12h00 – 14h00', weekend: '12h00 – 15h00' },
    socials: {
      instagram: 'https://www.instagram.com/golf_marcilly/',
      facebook: 'https://www.facebook.com/golfdemarcilly',
      tiktok: 'https://www.tiktok.com/@golf.de.marcilly',
      newsletter: ''
    },
    links: {
      booking: 'https://marcilly.reservations-golf.fr/',
      leclub: 'https://leclub-golf.com/fr/green-fees/france/5-golf-de-marcilly',
      departs: 'https://pages.ffgolf.org/departs/golf/5824d6b19f01d21a2e53b0249f2e9656',
      resultats: 'https://pages.ffgolf.org/resultats/liste-competitions/5824d6b19f01d21a2e53b0249f2e9656',
      plaquette: ''
    },
    announcement: { enabled: false },
    legal: { company: 'Golf de Marcilly en Villette — SARL au capital de 30 500 €', rcs: 'RCS Orléans B 334 925 419', siret: '334 925 419 000 15', tva: 'FR23 334 925 419', director: 'Pascal Parou' },
    images: {}
  }
};
(function () {
  var M = window.MARCILLY.MEDIA + 'import/';
  window.MARCILLY.defaults.images = {
    logo: M + 'a5febb_888bdde469ae41d3bee873ef6e0150fa.png',
    logo_navy: M + 'logo-navy.png',
    logo_white: M + 'logo-white.png',
    hero: M + 'aerial-clubhouse.jpg',
    aerial: M + 'aerial-course.jpg',
    leclub: M + 'a5febb_8c5b1542a6d6496db76dad3432667553.jpg'
  };
})();

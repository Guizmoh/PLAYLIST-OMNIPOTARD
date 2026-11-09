// ============================================================
//  CONFIGURATION — c'est le seul fichier à modifier
// ============================================================
window.PLAYLIST_CONFIG = {
  // Nom affiché en haut du site
  siteTitle: "Omnipotard",

  // Ton nom d'artiste (utilisé par défaut si un morceau n'en précise pas)
  artist: "Omnipotard",

  // Petit texte d'accueil sous le titre
  intro: "Écoute, note et laisse un commentaire — directement sur le morceau, au bon moment.",

  // Message affiché sur l'accueil et au-dessus des commentaires
  feedbackTitle: "Tes critiques m'aident à progresser",
  feedbackNote: "N'hésite surtout pas à être honnête : mix, mélodie, structure, son, ce qui marche et ce qui ne marche pas… Je ne me vexerai pas, au contraire — chaque critique constructive m'aide énormément à m'améliorer.",

  // ---- Supabase (pour que les commentaires soient partagés entre tous les visiteurs)
  // Laisse vide pour tester : les commentaires seront alors stockés seulement
  // dans ton navigateur (mode démo). Voir README.md pour la mise en place (5 min).
  supabaseUrl: "",       // ex: "https://abcdxyz.supabase.co"
  supabaseAnonKey: "",   // ex: "eyJhbGciOi..." (clé "anon public", pas la "service_role" !)

  // ---- Détection automatique des morceaux sur GitHub
  // Si le site est publié sur GitHub Pages, tous les fichiers audio déposés
  // dans le dossier "music/" apparaissent automatiquement.
  // Une image du même nom (ex: music/mon-son.jpg pour music/mon-son.mp3) sert de pochette.
  // Laisse vide : le dépôt est deviné à partir de l'adresse (pseudo.github.io/depot).
  githubRepo: "",        // ex: "pseudo/playlist" (seulement si la détection ne marche pas)
  githubBranch: "main",
  musicFolder: "music"
};

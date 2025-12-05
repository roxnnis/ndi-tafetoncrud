const Model = {
    score: 0,
    indexQuestion: 0,

    questions: [
        {
            question: "Combien ça coûte d'installer Linux sur ton PC ?",
            options: ["C'est 100% Gratuit (0€)", "Il faut payer un abonnement mensuel", "Ça coûte le prix d'un Kebab", "C'est gratuit seulement le mardi"],
            correct: "C'est 100% Gratuit (0€)"
        },
        {
            question: "Que signifie 'Open Source' pour Linux ?",
            options: ["Code public et modifiable", "Logiciel portes ouvertes", "Facile à pirater", "Fabriqué par Microsoft"],
            correct: "Code public et modifiable"
        },
        {
            question: "Quel est l'avantage des mises à jour Linux ?",
            options: ["Jamais de mises à jour", "Pas de redémarrage forcé", "Elles durent 4 heures", "Elles plantent tout"],
            correct: "Pas de redémarrage forcé"
        },
        {
            question: "Qui est la mascotte de Linux ?",
            options: ["Un chat noir", "Un robot", "Un manchot", "Une fenêtre"],
            correct: "Un manchot"
        },
        {
            question: "Qui sont les 'GAFAM' ?",
            options: ["Les 5 géants du web", "Un groupe de musique", "Une marque de téléphone français", "Le nom d'un virus"],
            correct: "Les 5 géants du web"
        },
        {
            question: "Quand on stocke un fichier sur le 'Cloud', où est-il réellement ?",
            options: ["Sur des ordinateurs (serveurs) allumés 24h/24", "Dans un satellite dans l'espace", "Dans les nuages (vapeur d'eau)", "Nulle part, c'est magique"],
            correct: "Sur des ordinateurs (serveurs) allumés 24h/24"
        },
        {
            question: "Pourquoi est-il risqué de stocker des données scolaires aux USA ?",
            options: ["La loi américaine permet d'y accéder (Cloud Act)", "Il pleut trop là-bas", "Les câbles sont trop longs", "C'est interdit par la police"],
            correct: "La loi américaine permet d'y accéder (Cloud Act)"
        },

        {
            question: "Quel est l'avantage d'un format ouvert (ex: .odt, .png, .pdf) ?",
            options: ["Il est lisible par tous les logiciels, pour toujours", "Il s'autodétruit après 3 jours", "Il est forcément payant", "On ne peut pas l'imprimer"],
            correct: "Il est lisible par tous les logiciels, pour toujours"
        },
        {
            question: "Wikipedia est l'exemple parfait...",
            options: ["D'un Bien Commun Numérique (appartient à tous)", "D'une entreprise privée comme Amazon", "D'un site gouvernemental", "D'un réseau social payant"],
            correct: "D'un Bien Commun Numérique (appartient à tous)"
        },
        // Thème : Souveraineté numérique (indépendance des données)
        {
            question: "Où partent souvent les données avec les logiciels américains (Microsoft, Google) ?",
            options: ["Sur des serveurs aux États-Unis", "Dans une clé USB à l'école", "Elles restent en France", "Elles sont supprimées immédiatement"],
            correct: "Sur des serveurs aux États-Unis"
        },

        // Thème : Compatibilité / Interopérabilité
        {
            question: "Peut-on ouvrir des fichiers Word ou Excel sous Linux ?",
            options: ["Non, c'est impossible", "Oui, avec LibreOffice par exemple", "Il faut payer un abonnement", "Seulement les mardis"],
            correct: "Oui, avec LibreOffice par exemple"
        },

        // Thème : Transparence et Sécurité
        {
            question: "Pourquoi le 'Code Ouvert' (Open Source) rassure sur la sécurité ?",
            options: ["Parce qu'il coûte cher", "Tout le monde peut vérifier qu'il n'y a pas d'espion", "Il est protégé par un mot de passe", "C'est fabriqué par la police"],
            correct: "Tout le monde peut vérifier qu'il n'y a pas d'espion"
        }
    ]
};
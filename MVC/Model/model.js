const Model = {
    score: 0,
    indexQuestion: 0,

    questions: [
        {
            question: "Combien ça coûte d'installer Linux sur ton PC ?",
            options: ["Il faut payer un abonnement mensuel", "Ça coûte le prix d'un Kebab", "C'est 100% Gratuit", "C'est gratuit seulement le mardi"],
            correct: "C'est 100% Gratuit"
        },
        {
            question: "Que signifie 'Open Source' pour Linux ?",
            options: ["Logiciel portes ouvertes", "Code public et modifiable", "Facile à pirater", "Fabriqué par Microsoft"],
            correct: "Code public et modifiable"
        },
        {
            question: "Quel est l'avantage des mises à jour Linux ?",
            options: ["Jamais de mises à jour", "Pas de redémarrage forcé", "Elles durent 4 heures", "Elles plantent tout"],
            correct: "Pas de redémarrage forcé"
        },
        {
            question: "Qui est la mascotte de Linux ?",
            options: ["Un chat noir", "Une fenêtre", "Un manchot", "Un robot"],
            correct: "Un manchot"
        },
        {
            question: "Qui sont les 'GAFAM' ?",
            options: ["Les 5 géants du web", "Un groupe de musique", "Une marque de téléphone français", "Le nom d'un virus"],
            correct: "Les 5 géants du web"
        },
        {
            question: "Quand on stocke un fichier sur le 'Cloud', où est-il réellement ?",
            options: ["Dans un satellite", "Dans les nuages (vapeur d'eau)", "Nulle part, c'est magique", "Sur des serveurs allumés 24h/24"],
            correct: "Sur des serveurs allumés 24h/24"
        },
        {
            question: "Pourquoi est-il risqué de stocker des données aux USA ?",
            options: ["La loi américaine permet d'y accéder", "Il pleut trop là-bas", "Les câbles sont trop longs", "C'est interdit par la police"],
            correct: "La loi américaine permet d'y accéder"
        },
        {
            question: "Quel est l'avantage d'un format ouvert (ex: .odt, .png) ?",
            options: ["Il s'autodétruit après 3 jours", "Il est lisible par tous les logiciels", "Il est forcément payant", "On ne peut pas l'imprimer"],
            correct: "Il est lisible par tous les logiciels"
        },
        {
            question: "Wikipedia est l'exemple parfait...",
            options: ["D'une entreprise privée", "D'un site gouvernemental", "D'un Bien Commun Numérique", "D'un réseau social payant"],
            correct: "D'un Bien Commun Numérique"
        },
        {
            question: "Où partent souvent les données avec Google ou Microsoft ?",
            options: ["Elles restent en France", "Sur des serveurs aux États-Unis", "Dans une clé USB à l'école", "Elles sont supprimées immédiatement"],
            correct: "Sur des serveurs aux États-Unis"
        }
    ]
};
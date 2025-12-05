const Controller = {
    appContainer: null,

    async init() {
        this.appContainer = document.getElementById('app-container');
        this.start();
    },

    async fetchTemplate(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error("Impossible de charger " + path);
            return await response.text();
        } catch (error) {
            console.error(error);
            alert("Erreur : Impossible de charger les vues. Utilisez-vous bien Live Server ?");
        }
    },

    start() {
        Model.score = 0;
        Model.indexQuestion = 0;
        this.afficherQuestion();
    },

    async afficherQuestion() {
        if (Model.indexQuestion >= Model.questions.length) {
            this.afficherResultat();
            return;
        }

        const html = await this.fetchTemplate('MVC/Vue/game.html');
        this.appContainer.innerHTML = html;

        const currentQ = Model.questions[Model.indexQuestion];

        document.getElementById('question-text').textContent = currentQ.question;
        document.getElementById('current-question-number').textContent = Model.indexQuestion + 1;
        document.getElementById('total-questions').textContent = Model.questions.length;

        const answersArea = document.getElementById('answers-area');
        answersArea.innerHTML = ''; 

        currentQ.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = "btn btn-outline-dark text-start py-3 px-4 fw-bold shadow-sm";
            btn.textContent = option;
            
            btn.onclick = () => this.gererReponse(option);
            
            answersArea.appendChild(btn);
        });
    },

    gererReponse(reponseUtilisateur) {
        const bonneReponse = Model.questions[Model.indexQuestion].correct;
        
        if (reponseUtilisateur === bonneReponse) {
            Model.score++;
        } else {
            alert("Faux ! La bonne réponse était : " + bonneReponse);
        }

        Model.indexQuestion++;
        this.afficherQuestion();
    },

    async afficherResultat() {
        const html = await this.fetchTemplate('MVC/Vue/result.html');
        this.appContainer.innerHTML = html;

        document.getElementById('final-score').textContent = `${Model.score} / ${Model.questions.length}`;
        
        const comment = document.getElementById('comment-text');
        if (Model.score === Model.questions.length) comment.textContent = "Expert Linux ! 🐧";
        else if (Model.score > Model.questions.length/2) comment.textContent = "Pas mal du tout !";
        else comment.textContent = "Windows t'a eu... Réessaye !";

        document.getElementById('btn-restart').onclick = () => this.start();
    }
};
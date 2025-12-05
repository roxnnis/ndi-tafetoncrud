const Controller = {
    appContainer: null,
    audioError: new Audio('assets/sfx/error.mp3'),
    audioSuccess: new Audio('assets/sfx/success.mp3'),

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
            alert("Erreur de chargement. Vérifiez Live Server.");
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

        const html = await this.fetchTemplate('MVC/Vue/templates/game.html');
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
            this.triggerSuccess();
        } else {
            this.triggerPunition();
        }

        Model.indexQuestion++;
        
        setTimeout(() => {
            this.afficherQuestion();
        }, 1200);
    },

    triggerPunition() {
        const body = document.body;
        const meme = document.getElementById('meme-overlay');
        const quizBox = document.getElementById('quiz-main-box');

        this.audioError.currentTime = 0;
        this.audioError.play().catch(e => console.log("Audio play failed", e));

        if(quizBox) quizBox.classList.add('shake-effect');
        meme.classList.add('active');
        body.classList.add('bg-error');

        setTimeout(() => {
            if(quizBox) quizBox.classList.remove('shake-effect');
            meme.classList.remove('active');
            body.classList.remove('bg-error');
        }, 1000);
    },

    triggerSuccess() {
        const body = document.body;
        const successImg = document.getElementById('success-overlay');
        
        this.audioSuccess.currentTime = 0;
        this.audioSuccess.play().catch(e => console.log("Audio play failed", e));

        successImg.classList.add('active');
        body.classList.add('bg-success');

        setTimeout(() => {
            successImg.classList.remove('active');
            body.classList.remove('bg-success');
        }, 1000);
    },

    async afficherResultat() {
        const html = await this.fetchTemplate('MVC/Vue/templates/result.html');
        this.appContainer.innerHTML = html;

        document.getElementById('final-score').textContent = `${Model.score} / ${Model.questions.length}`;
        
        const comment = document.getElementById('comment-text');
        if (Model.score === Model.questions.length) comment.textContent = "Expert Linux ! 🐧";
        else if (Model.score > Model.questions.length/2) comment.textContent = "Pas mal du tout !";
        else comment.textContent = "Windows t'a eu... Réessaye !";

        document.getElementById('btn-restart').onclick = () => this.start();
    }
};
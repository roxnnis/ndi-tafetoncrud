const Controller = {
    start() {
        Model.score = 0;
        Model.indexQuestion = 0;
        
        View.btnRestart.onclick = () => this.start();
        
        this.chargerQuestionSuivante();
    },

    chargerQuestionSuivante() {
        if (Model.indexQuestion < Model.questions.length) {
            const q = Model.questions[Model.indexQuestion];
            View.afficherQuestion(q, Model.indexQuestion, Model.questions.length);
        } else {
            View.afficherResultat(Model.score, Model.questions.length);
        }
    },

    gererReponse(reponseUtilisateur) {
        const bonneReponse = Model.questions[Model.indexQuestion].correct;
        
        if (reponseUtilisateur === bonneReponse) {
            Model.score++;
        } else {
            alert("Faux ! La bonne réponse était : " + bonneReponse);
        }

        Model.indexQuestion++;
        this.chargerQuestionSuivante();
    }
};
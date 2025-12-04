export class QuizController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        // On connecte les événements de la Vue aux fonctions du Contrôleur
        this.view.bindSubmitAnswer(this.handleSubmit.bind(this));
        this.view.bindRestart(this.handleRestart.bind(this));

        // Lancement initial
        this.displayCurrentQuestion();
    }

    displayCurrentQuestion() {
        const question = this.model.getCurrentQuestion();
        const index = this.model.currentQuestionIndex;
        this.view.renderQuestion(question, index);
    }

    handleSubmit() {
        const answer = this.view.getSelectedAnswer();

        if (answer) {
            // 1. Vérifie la réponse
            this.model.checkAnswer(answer);
            
            // 2. Passe à la suivante
            this.model.nextQuestion();

            // 3. Décide quoi afficher (Question suivante ou Résultat)
            if (this.model.hasMoreQuestions()) {
                this.displayCurrentQuestion();
            } else {
                this.view.showResult(this.model.score, this.model.getTotalQuestions());
            }
        } else {
            alert("Merci de sélectionner une réponse avant de valider !");
        }
    }

    handleRestart() {
        this.model.reset();
        this.displayCurrentQuestion();
    }
}
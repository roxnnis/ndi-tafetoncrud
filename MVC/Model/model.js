export class QuizModel {
    constructor() {
        this.score = 0;
        this.currentQuestionIndex = 0;
        
        // Vos données (Questions)
        this.questions = [
            {
                question: "Quelle est la capitale de la Savoie ?",
                options: ["Annecy", "Chambéry", "Grenoble", "Lyon"],
                correct: "Chambéry"
            },
            {
                question: "Lequel de ces frameworks est basé sur JavaScript ?",
                options: ["Laravel", "Django", "React", "Spring"],
                correct: "React"
            },
            {
                question: "Quelle balise HTML crée un lien hypertexte ?",
                options: ["<link>", "<a>", "<href>", "<p>"],
                correct: "<a>"
            },
            {
                question: "Que signifie 'CSS' ?",
                options: ["Cascading Style Sheets", "Creative Style System", "Computer Style Sheets", "Colorful Style Sheets"],
                correct: "Cascading Style Sheets"
            }
        ];
    }

    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }

    checkAnswer(answer) {
        const currentQ = this.getCurrentQuestion();
        if (answer === currentQ.correct) {
            this.score++;
        }
    }

    nextQuestion() {
        this.currentQuestionIndex++;
    }

    hasMoreQuestions() {
        return this.currentQuestionIndex < this.questions.length;
    }

    getTotalQuestions() {
        return this.questions.length;
    }

    reset() {
        this.score = 0;
        this.currentQuestionIndex = 0;
    }
}
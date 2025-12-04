export class QuizView {
    constructor() {
        // Récupération des éléments du DOM
        this.questionBlock = document.getElementById('question-block');
        this.answerBlock = document.getElementById('answer-block');
        this.resultBlock = document.getElementById('result-block');
        
        this.questionText = document.getElementById('question-text');
        this.questionNumber = document.getElementById('question-number');
        this.answerOptions = document.getElementById('answer-options');
        this.answerForm = document.getElementById('answer-form');
        this.scoreText = document.getElementById('score-text');
        this.restartBtn = document.getElementById('restart-btn');
    }

    renderQuestion(questionObj, index) {
        // Gérer l'affichage des blocs
        this.questionBlock.classList.remove('d-none');
        this.answerBlock.classList.remove('d-none');
        this.resultBlock.classList.add('d-none');

        // Remplir le texte
        this.questionText.textContent = questionObj.question;
        this.questionNumber.textContent = index + 1;
        
        // Générer les options (HTML)
        this.answerOptions.innerHTML = '';
        questionObj.options.forEach((option, i) => {
            const html = `
                <div class="option-item">
                    <input class="form-check-input" type="radio" name="answer" id="opt${i}" value="${option}">
                    <label class="form-check-label shadow-sm" for="opt${i}">
                        ${option}
                    </label>
                </div>
            `;
            this.answerOptions.insertAdjacentHTML('beforeend', html);
        });
    }

    showResult(score, total) {
        this.questionBlock.classList.add('d-none');
        this.answerBlock.classList.add('d-none');
        this.resultBlock.classList.remove('d-none');
        
        this.scoreText.textContent = `Votre score final : ${score} / ${total}`;
    }

    getSelectedAnswer() {
        const checkedInput = this.answerForm.querySelector('input[name="answer"]:checked');
        return checkedInput ? checkedInput.value : null;
    }

    bindSubmitAnswer(handler) {
        this.answerForm.addEventListener('submit', event => {
            event.preventDefault();
            handler();
        });
    }

    bindRestart(handler) {
        this.restartBtn.addEventListener('click', handler);
    }
}
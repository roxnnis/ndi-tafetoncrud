const View = {
    questionText: document.getElementById('question-text'),
    currentNum: document.getElementById('current-question-number'),
    totalNum: document.getElementById('total-questions'),
    answersArea: document.getElementById('answers-area'),
    gameScreen: document.getElementById('game-screen'),
    resultScreen: document.getElementById('result-screen'),
    finalScore: document.getElementById('final-score'),
    commentText: document.getElementById('comment-text'),
    btnRestart: document.getElementById('btn-restart'),

    afficherQuestion(questionObj, index, total) {
        this.gameScreen.classList.remove('d-none');
        this.resultScreen.classList.add('d-none');
        
        this.questionText.textContent = questionObj.question;
        this.currentNum.textContent = index + 1;
        this.totalNum.textContent = total;
        
        this.answersArea.innerHTML = "";
        
        questionObj.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = "btn btn-outline-dark text-start py-3 px-4 fw-bold shadow-sm";
            btn.textContent = option;
            
            btn.onclick = () => Controller.gererReponse(option);
            
            this.answersArea.appendChild(btn);
        });
    },

    afficherResultat(score, total) {
        this.gameScreen.classList.add('d-none');
        this.resultScreen.classList.remove('d-none');
        this.finalScore.textContent = `${score} / ${total}`;
        
        if (score === total) this.commentText.textContent = "Expert Linux ! 🐧";
        else if (score > total/2) this.commentText.textContent = "Pas mal !";
        else this.commentText.textContent = "Essaye encore !";
    }
};
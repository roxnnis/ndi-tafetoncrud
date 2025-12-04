import { QuizModel } from './Model/model.js';
import { QuizView } from './Vue/view.js';
import { QuizController } from './Controller/controller.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new QuizController(new QuizModel(), new QuizView());
});
/**
 * Audio Recorder UI (View)
 * Gère UNIQUEMENT l'interface utilisateur - Respect strict de l'architecture MVC
 * Ne contient AUCUNE logique métier - tout passe par le Controller
 */

class AudioRecorderUI {
    constructor(controller) {
        // Le controller est injecté depuis l'extérieur (Dependency Injection)
        // La View ne doit JAMAIS instancier le Controller elle-même
        if (!controller) {
            throw new Error('AudioRecorderUI nécessite un AudioController en paramètre');
        }
        
        this.controller = controller;
        this.currentRecordingId = null;
        this.timerInterval = null;
        this.timerElapsedSeconds = 0; // Nombre de secondes écoulées
        this.isPaused = false;
        
        this.init();
    }

    /**
     * Initialise l'interface
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.setupControllerListeners();
        this.setupCleanupHandlers();
        this.loadInitialData();
        this.updateUI();
        
        console.log('✅ Interface initialisée');
    }

    /**
     * Configure les gestionnaires de nettoyage
     */
    setupCleanupHandlers() {
        // Nettoie les ressources quand l'utilisateur quitte la page
        window.addEventListener('beforeunload', () => {
            console.log('👋 Fermeture de la page - nettoyage des ressources');
            this.controller.cleanup();
        });
        
        // Nettoie aussi lors de la fermeture du navigateur
        window.addEventListener('unload', () => {
            this.controller.cleanup();
        });
    }

    /**
     * Met en cache les éléments DOM
     */
    cacheElements() {
        // Boutons de contrôle
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        
        // Affichage d'état
        this.statusLight = document.getElementById('statusLight');
        this.statusText = document.getElementById('statusText');
        this.timerDisplay = document.getElementById('timerDisplay');
        
        // Options
        this.enableSilenceDetection = document.getElementById('enableSilenceDetection');
        this.enableTranscription = document.getElementById('enableTranscription');
        this.enableEmailAlerts = document.getElementById('enableEmailAlerts');
        
        // Sections
        this.transcriptionSection = document.getElementById('transcriptionSection');
        this.transcriptionDisplay = document.getElementById('transcriptionDisplay');
        
        // Listes
        this.recordingsList = document.getElementById('recordingsList');
        this.silencesList = document.getElementById('silencesList');
        this.transcriptionsList = document.getElementById('transcriptionsList');
        
        // Onglets
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabPanels = document.querySelectorAll('.tab-panel');
        
        // Canvas
        this.audioCanvas = document.getElementById('audioCanvas');
        this.canvasCtx = this.audioCanvas ? this.audioCanvas.getContext('2d') : null;
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Boutons de contrôle
        this.startBtn.addEventListener('click', () => this.handleStart());
        // Le bouton pause utilise onclick dynamique (voir onRecordingStarted/onRecordingPaused/onRecordingResumed)
        this.stopBtn.addEventListener('click', () => this.handleStop());
        
        // Onglets
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Configuration
        document.getElementById('saveConfigBtn')?.addEventListener('click', () => this.saveConfiguration());
        document.getElementById('cleanupBtn')?.addEventListener('click', () => this.cleanupExpired());
        document.getElementById('generateReportBtn')?.addEventListener('click', () => this.generateReport());
        
        // Option transcription
        this.enableTranscription.addEventListener('change', (e) => {
            this.transcriptionSection.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    /**
     * Configure les écouteurs du contrôleur
     */
    setupControllerListeners() {
        window.addEventListener('audio:recordingStarted', () => this.onRecordingStarted());
        window.addEventListener('audio:recordingStopped', () => this.onRecordingStopped());
        window.addEventListener('audio:recordingPaused', () => this.onRecordingPaused());
        window.addEventListener('audio:recordingResumed', () => this.onRecordingResumed());
        window.addEventListener('audio:recordingUpdate', (e) => this.onRecordingUpdate(e.detail));
        window.addEventListener('audio:recordingAdded', (e) => this.onRecordingAdded(e.detail));
        window.addEventListener('audio:silenceUpdate', (e) => this.onSilenceUpdate(e.detail));
        window.addEventListener('audio:alertGenerated', (e) => this.onAlert(e.detail));
        window.addEventListener('audio:transcriptionUpdated', (e) => this.onTranscriptionUpdate(e.detail));
        window.addEventListener('audio:transcriptionAdded', () => this.refreshTranscriptions());
    }

    /**
     * Charge les données initiales via le Controller
     */
    loadInitialData() {
        this.refreshRecordings();
        this.refreshSilences();
        this.refreshTranscriptions();
        this.refreshConfiguration();
        this.refreshStatistics();
    }

    /**
     * Gère le démarrage de l'enregistrement
     */
    async handleStart() {
        const transcriptionEnabled = this.enableTranscription.checked;
        const silenceEnabled = this.enableSilenceDetection.checked;
        
        console.log('🎬 Démarrage enregistrement - Options:', {
            transcription: transcriptionEnabled,
            silenceDetection: silenceEnabled
        });
        
        const options = {
            enableTranscription: transcriptionEnabled,
            config: {
                silenceDetection: silenceEnabled
            }
        };

        const result = await this.controller.startRecording(options);
        
        console.log('🎬 Résultat:', result);
        
        if (result.success) {
            let message = 'Enregistrement démarré';
            if (result.features) {
                if (result.features.transcription) message += ' (+ transcription)';
                if (result.features.silenceDetection) message += ' (+ détection blancs)';
            }
            this.showToast(message, 'success');
        } else {
            this.showToast(result.message, 'error');
        }
    }

    /**
     * Gère la pause
     */
    handlePause() {
        const result = this.controller.pauseRecording();
        this.showToast(result.message, result.success ? 'info' : 'error');
    }

    /**
     * Gère la reprise
     */
    handleResume() {
        const result = this.controller.resumeRecording();
        this.showToast(result.message, result.success ? 'info' : 'error');
    }

    /**
     * Gère l'arrêt
     */
    handleStop() {
        const result = this.controller.stopRecording();
        this.showToast(result.message, result.success ? 'success' : 'error');
    }

    /**
     * Événement: enregistrement démarré
     */
    onRecordingStarted() {
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.pauseBtn.innerHTML = '<span class="icon">⏸</span><span>Pause</span>';
        this.pauseBtn.onclick = () => this.handlePause();
        this.stopBtn.disabled = false;
        
        this.statusLight.className = 'status-light recording';
        this.statusText.textContent = 'Enregistrement en cours...';
        
        this.startTimer();
    }

    /**
     * Événement: enregistrement arrêté
     */
    onRecordingStopped() {
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.stopBtn.disabled = true;
        
        this.statusLight.className = 'status-light';
        this.statusText.textContent = 'Prêt à enregistrer';
        
        this.stopTimer();
        this.refreshRecordings();
        this.refreshStatistics();
    }

    /**
     * Événement: enregistrement en pause
     */
    onRecordingPaused() {
        this.pauseBtn.textContent = '▶ Reprendre';
        this.pauseBtn.onclick = () => this.handleResume();
        this.statusText.textContent = 'En pause';
        this.statusLight.className = 'status-light paused';
        
        // Met en pause le timer
        this.pauseTimer();
    }

    /**
     * Événement: enregistrement repris
     */
    onRecordingResumed() {
        this.pauseBtn.innerHTML = '<span class="icon">⏸</span><span>Pause</span>';
        this.pauseBtn.onclick = () => this.handlePause();
        this.statusText.textContent = 'Enregistrement en cours...';
        this.statusLight.className = 'status-light recording';
        
        // Reprend le timer
        this.resumeTimer();
    }

    /**
     * Événement: mise à jour de l'enregistrement
     */
    onRecordingUpdate(data) {
        this.updateTimer(data.duration);
    }

    /**
     * Événement: nouvel enregistrement
     */
    onRecordingAdded(recording) {
        this.addRecordingToList(recording);
    }

    /**
     * Événement: silence détecté
     */
    onSilenceUpdate(silence) {
        this.refreshSilences();
    }

    /**
     * Événement: alerte générée
     */
    onAlert(alert) {
        this.showToast(`⚠️ Blanc non-naturel détecté (${Math.round(alert.duration / 1000)}s)`, 'warning');
    }

    /**
     * Événement: transcription mise à jour
     */
    onTranscriptionUpdate(data) {
        console.log('📝 UI: Transcription reçue:', data);
        
        if (data.final && data.final.length > 0) {
            // Supprime le placeholder si présent
            const placeholder = this.transcriptionDisplay.querySelector('.placeholder');
            if (placeholder) {
                placeholder.remove();
            }
            
            const p = document.createElement('p');
            p.textContent = data.final;
            p.style.marginBottom = '8px';
            p.style.lineHeight = '1.5';
            this.transcriptionDisplay.appendChild(p);
            
            // Scroll automatique
            this.transcriptionDisplay.scrollTop = this.transcriptionDisplay.scrollHeight;
        }
        
        // Mise à jour des stats
        if (data.fullText) {
            const words = data.fullText.split(' ').filter(w => w.length > 0).length;
            document.getElementById('wordCount').textContent = words;
        }
        
        if (data.segmentCount !== undefined) {
            document.getElementById('segmentCount').textContent = data.segmentCount;
        }
    }

    /**
     * Démarre le timer
     */
    startTimer() {
        // Réinitialise le timer
        this.timerElapsedSeconds = 0;
        this.isPaused = false;
        this.updateTimerDisplay();
        
        // Incrémente chaque seconde
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.timerElapsedSeconds++;
                this.updateTimerDisplay();
            }
        }, 1000);
    }

    /**
     * Arrête le timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timerElapsedSeconds = 0;
        this.isPaused = false;
        this.timerDisplay.textContent = '00:00:00';
    }

    /**
     * Met en pause le timer
     */
    pauseTimer() {
        this.isPaused = true;
    }

    /**
     * Reprend le timer
     */
    resumeTimer() {
        this.isPaused = false;
    }

    /**
     * Met à jour l'affichage du timer
     */
    updateTimerDisplay() {
        const seconds = this.timerElapsedSeconds;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        this.timerDisplay.textContent = 
            String(h).padStart(2, '0') + ':' + 
            String(m).padStart(2, '0') + ':' + 
            String(s).padStart(2, '0');
    }

    /**
     * Met à jour le timer (pour compatibilité avec les événements existants)
     */
    updateTimer(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        this.timerDisplay.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Rafraîchit l'affichage des enregistrements
     */
    refreshRecordings() {
        const data = this.controller.getAllData();
        const recordings = data.recordings;
        
        if (recordings.length === 0) {
            this.recordingsList.innerHTML = '<p class="empty-message">Aucun enregistrement pour le moment</p>';
            return;
        }
        
        this.recordingsList.innerHTML = '';
        recordings.forEach(recording => this.addRecordingToList(recording));
    }

    /**
     * Ajoute un enregistrement à la liste
     */
    addRecordingToList(recording) {
        const div = document.createElement('div');
        div.className = 'recording-item';
        div.innerHTML = `
            <div class="recording-info">
                <h4>${recording.name}</h4>
                <p class="recording-meta">
                    <span>📅 ${new Date(recording.timestamp).toLocaleString('fr-FR')}</span>
                    <span>⏱️ ${this.formatDuration(recording.duration)}</span>
                    <span>💾 ${this.formatSize(recording.size)}</span>
                </p>
            </div>
            <div class="recording-actions">
                <button class="btn-icon" onclick="ui.playRecording(${recording.id})" title="Écouter">▶</button>
                <button class="btn-icon" onclick="ui.downloadRecording(${recording.id})" title="Télécharger">⬇</button>
                <button class="btn-icon" onclick="ui.renameRecording(${recording.id})" title="Renommer">✏️</button>
                <button class="btn-icon danger" onclick="ui.deleteRecording(${recording.id})" title="Supprimer">🗑️</button>
            </div>
        `;
        
        if (this.recordingsList.querySelector('.empty-message')) {
            this.recordingsList.innerHTML = '';
        }
        
        this.recordingsList.insertBefore(div, this.recordingsList.firstChild);
    }

    /**
     * Rafraîchit l'affichage des silences
     */
    refreshSilences() {
        const data = this.controller.getAllData();
        const silences = data.silences;
        
        if (silences.length === 0) {
            this.silencesList.innerHTML = '<p class="empty-message">Aucun blanc détecté</p>';
            this.updateSilenceStats();
            return;
        }
        
        this.silencesList.innerHTML = '';
        silences.forEach(silence => {
            const div = document.createElement('div');
            div.className = `silence-item ${silence.type}`;
            div.innerHTML = `
                <div class="silence-info">
                    <h4>${silence.type === 'natural' ? '✅ Blanc naturel' : '⚠️ Blanc non-naturel'}</h4>
                    <p>Durée: ${Math.round(silence.duration / 1000)}s | ${new Date(silence.timestamp).toLocaleTimeString('fr-FR')}</p>
                    ${silence.aiClassification ? `<p class="ai-reason">${silence.aiClassification.reason}</p>` : ''}
                </div>
            `;
            this.silencesList.appendChild(div);
        });
        
        this.updateSilenceStats();
    }

    /**
     * Met à jour les statistiques de silence
     */
    updateSilenceStats() {
        const stats = this.controller.getGlobalStatistics();
        document.getElementById('totalSilences').textContent = stats.silences.total;
        document.getElementById('naturalSilences').textContent = stats.silences.natural;
        document.getElementById('unnaturalSilences').textContent = stats.silences.unnatural;
    }

    /**
     * Rafraîchit l'affichage des transcriptions
     */
    refreshTranscriptions() {
        const data = this.controller.getAllData();
        const transcriptions = data.transcriptions;
        
        if (transcriptions.length === 0) {
            this.transcriptionsList.innerHTML = '<p class="empty-message">Aucune transcription disponible</p>';
            return;
        }
        
        this.transcriptionsList.innerHTML = '';
        transcriptions.forEach(trans => {
            const div = document.createElement('div');
            div.className = 'transcription-item';
            div.innerHTML = `
                <div class="transcription-header">
                    <h4>Transcription #${trans.id}</h4>
                    <span>${new Date(trans.startTime).toLocaleString('fr-FR')}</span>
                </div>
                <p class="transcription-preview">${trans.fullText.substring(0, 200)}...</p>
                <div class="transcription-actions">
                    <button class="btn-small" onclick="ui.exportTranscription(${trans.id}, 'txt')">TXT</button>
                    <button class="btn-small" onclick="ui.exportTranscription(${trans.id}, 'json')">JSON</button>
                    <button class="btn-small" onclick="ui.exportTranscription(${trans.id}, 'srt')">SRT</button>
                    <button class="btn-small" onclick="ui.analyzeTranscription(${trans.id})">📊 Analyser</button>
                </div>
            `;
            this.transcriptionsList.appendChild(div);
        });
    }

    /**
     * Rafraîchit l'affichage de la configuration
     */
    refreshConfiguration() {
        const data = this.controller.getAllData();
        
        console.log('🔄 Chargement de la configuration dans l\'UI:', {
            silenceThreshold: data.configs.silence.threshold,
            recordingFormat: data.configs.recording.format
        });
        
        // Configuration enregistrement
        document.getElementById('audioFormat').value = data.configs.recording.format;
        document.getElementById('audioBitrate').value = data.configs.recording.audioBitsPerSecond;
        document.getElementById('maxDuration').value = data.configs.recording.maxDuration;
        document.getElementById('retentionDays').value = data.configs.recording.retentionDays;
        
        // Configuration silence
        document.getElementById('silenceThreshold').value = data.configs.silence.threshold;
        document.getElementById('minSilenceDuration').value = data.configs.silence.minSilenceDuration;
        document.getElementById('naturalSilenceMax').value = data.configs.silence.naturalSilenceMaxDuration;
        document.getElementById('emailThreshold').value = data.configs.silence.emailThreshold;
        document.getElementById('enableAIDetection').checked = data.configs.silence.enableAIDetection;
        
        // Configuration transcription
        document.getElementById('transcriptionLanguage').value = data.configs.transcription.language;
        document.getElementById('conversationThreshold').value = data.configs.transcription.conversationThreshold / 60000;
        document.getElementById('segmentMaxDuration').value = data.configs.transcription.segmentMaxDuration / 60000;
        document.getElementById('enableAutoSegmentation').checked = data.configs.transcription.autoSegmentation;
    }

    /**
     * Sauvegarde la configuration
     */
    saveConfiguration() {
        // Enregistrement
        this.controller.setRecordingConfig({
            format: document.getElementById('audioFormat').value,
            audioBitsPerSecond: parseInt(document.getElementById('audioBitrate').value),
            maxDuration: parseInt(document.getElementById('maxDuration').value),
            retentionDays: parseInt(document.getElementById('retentionDays').value)
        });
        
        // Silence
        this.controller.setSilenceConfig({
            threshold: parseInt(document.getElementById('silenceThreshold').value),
            minSilenceDuration: parseInt(document.getElementById('minSilenceDuration').value),
            naturalSilenceMaxDuration: parseInt(document.getElementById('naturalSilenceMax').value),
            notificationThreshold: parseInt(document.getElementById('notificationThreshold').value),
            enableAIDetection: document.getElementById('enableAIDetection').checked
        });
        
        // Transcription
        this.controller.setTranscriptionConfig({
            language: document.getElementById('transcriptionLanguage').value,
            conversationThreshold: parseInt(document.getElementById('conversationThreshold').value) * 60000,
            segmentMaxDuration: parseInt(document.getElementById('segmentMaxDuration').value) * 60000,
            autoSegmentation: document.getElementById('enableAutoSegmentation').checked
        });
        
        console.log('💾 Configuration sauvegardée avec succès');
        
        // Vérifie si un enregistrement est en cours
        const state = this.controller.getState();
        if (state.isRecording) {
            console.log('⚠️ Configuration modifiée pendant l\'enregistrement');
            this.showToast('Configuration sauvegardée - Appliquée pour les prochains enregistrements', 'info');
        } else {
            this.showToast('Configuration sauvegardée', 'success');
        }
    }

    /**
     * Rafraîchit l'affichage des statistiques
     */
    refreshStatistics() {
        const stats = this.controller.getGlobalStatistics();
        
        document.getElementById('statTotalRecordings').textContent = stats.recordings.total;
        document.getElementById('statTotalDuration').textContent = this.formatDuration(stats.recordings.totalDuration);
        document.getElementById('statTotalSize').textContent = this.formatSize(stats.recordings.totalSize);
        document.getElementById('statTotalSilences').textContent = stats.silences.total;
        document.getElementById('statAlertsSent').textContent = stats.silences.alertsSent;
        document.getElementById('statTranscriptions').textContent = stats.transcriptions.total;
    }

    /**
     * Actions sur les enregistrements
     */
    playRecording(id) {
        const recording = this.controller.getRecordingById(id);
        if (!recording) {
            this.showToast('Enregistrement introuvable', 'error');
            return;
        }
        
        // Crée un lecteur audio temporaire
        const audioUrl = URL.createObjectURL(recording.blob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
            this.showToast('Erreur lors de la lecture', 'error');
            URL.revokeObjectURL(audioUrl);
        };
        
        audio.play().catch(err => {
            this.showToast('Impossible de lire l\'audio', 'error');
            console.error('Erreur lecture audio:', err);
        });
        
        this.showToast('Lecture en cours...', 'info');
    }

    downloadRecording(id) {
        this.controller.downloadRecording(id);
    }

    deleteRecording(id) {
        if (confirm('Supprimer cet enregistrement ?')) {
            this.controller.deleteRecording(id);
            this.refreshRecordings();
            this.refreshStatistics();
        }
    }

    renameRecording(id) {
        const newName = prompt('Nouveau nom:');
        if (newName) {
            this.controller.renameRecording(id, newName);
            this.refreshRecordings();
        }
    }

    /**
     * Actions sur les transcriptions
     */
    exportTranscription(id, format) {
        this.controller.exportTranscription(id, format);
    }

    analyzeTranscription(id) {
        const result = this.controller.analyzeTranscription(id);
        if (result.success) {
            alert(JSON.stringify(result.analysis, null, 2));
        }
    }

    /**
     * Nettoie les enregistrements expirés
     */
    cleanupExpired() {
        const result = this.controller.cleanupExpiredRecordings();
        this.showToast(result.message, 'success');
        this.refreshRecordings();
        this.refreshStatistics();
    }

    /**
     * Génère un rapport
     */
    async generateReport() {
        const report = await this.controller.generateDailyReport();
        this.showToast('Rapport généré et envoyé', 'success');
    }

    /**
     * Change d'onglet
     */
    switchTab(tabName) {
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.tabPanels.forEach(panel => panel.classList.remove('active'));
        
        const button = document.querySelector(`[data-tab="${tabName}"]`);
        const panel = document.getElementById(tabName);
        
        if (button && panel) {
            button.classList.add('active');
            panel.classList.add('active');
            
            // Rafraîchit les données si nécessaire
            if (tabName === 'statistics') {
                this.refreshStatistics();
            }
        }
    }

    /**
     * Affiche une notification toast
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    }

    /**
     * Utilitaires de formatage
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Met à jour l'interface périodiquement
     */
    updateUI() {
        setInterval(() => {
            const data = this.controller.getAllData();
            if (!data.state.isRecording) {
                this.refreshStatistics();
            }
        }, 30000); // Mise à jour toutes les 30 secondes
    }
}

let controller;
let ui;

document.addEventListener('DOMContentLoaded', () => {
    // Vérifie la disponibilité de Web Speech API
    const hasSpeechAPI = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    if (!hasSpeechAPI) {
        console.warn('⚠️ Web Speech API non disponible');
        console.log('🌐 Navigateur actuel:', navigator.userAgent);
        console.log('💡 Pour la transcription, utilisez:');
        console.log('   - Google Chrome (recommandé)');
        console.log('   - Microsoft Edge');
        console.log('   - Safari');
    } else {
        console.log('✅ Web Speech API disponible pour la transcription');
    }
    
    // 1. Instanciation du Controller (logique métier)
    controller = new AudioController();
    
    // 2. Injection du Controller dans la View (Dependency Injection)
    //    La View ne crée JAMAIS le Controller elle-même
    ui = new AudioRecorderUI(controller);
    
    console.log('✅ Architecture MVC respectée : Controller → View');
});
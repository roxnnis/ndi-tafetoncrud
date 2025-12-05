/**
 * AudioController
 * Contrôleur principal du module d'enregistrement audio
 * Orchestre les interactions entre les Models et la View
 */

class AudioController {
    constructor() {
        // Initialisation des models
        this.audioRecorder = new AudioRecorder();
        this.silenceDetector = new SilenceDetector();
        this.transcriptionService = new TranscriptionService();

        // État de l'application
        this.state = {
            isRecording: false,
            isPaused: false,
            isSilenceMonitoring: false,
            isTranscribing: false,
            currentRecordingId: null,
            recordingStartTime: null
        };

        // Timers
        this.updateTimer = null;
        this.cleanupTimer = null;

        // Initialisation
        this.init();
    }

    /**
     * Initialise le contrôleur
     */
    init() {
        this.setupEventListeners();
        this.startCleanupScheduler();
        this.loadState();
        
        console.log('🎙️ AudioController initialisé');
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Événements d'enregistrement
        window.addEventListener('recordingComplete', (e) => {
            this.handleRecordingComplete(e.detail);
        });

        // Événements de détection de silence
        window.addEventListener('silenceDetected', (e) => {
            this.handleSilenceDetected(e.detail);
        });

        window.addEventListener('silenceAlert', (e) => {
            this.handleSilenceAlert(e.detail);
        });

        // Événements transcription
        window.addEventListener('transcriptionUpdate', (e) => {
            this.handleTranscriptionUpdate(e.detail);
        });
        
        window.addEventListener('transcriptionSaved', (e) => {
            console.log('💾 Transcription sauvegardée détectée par Controller');
            this.dispatchEvent('transcriptionAdded', e.detail);
        });

        window.addEventListener('transcriptionComplete', (e) => {
            this.handleTranscriptionComplete(e.detail);
        });

        window.addEventListener('longConversationDetected', (e) => {
            this.handleLongConversation(e.detail);
        });
    }

    /**
     * Démarre l'enregistrement
     */
    async startRecording(options = {}) {
        if (this.state.isRecording) {
            return { success: false, message: 'Enregistrement déjà en cours' };
        }

        try {
            // Configuration optionnelle
            if (options.config) {
                this.audioRecorder.setConfig(options.config);
            }

            // Démarre l'enregistrement
            const recordResult = await this.audioRecorder.startRecording();
            if (!recordResult.success) {
                return recordResult;
            }

            // Initialise la détection de silence si activée
            if (this.audioRecorder.config.silenceDetection) {
                const silenceResult = await this.silenceDetector.initialize(
                    this.audioRecorder.audioStream
                );
                
                if (silenceResult.success) {
                    this.silenceDetector.startMonitoring();
                    this.state.isSilenceMonitoring = true;
                }
            }

            // Démarre la transcription si activée
            if (options.enableTranscription) {
                console.log('🎤 Tentative de démarrage de la transcription...');
                const transResult = this.transcriptionService.startTranscription();
                console.log('🎤 Résultat démarrage transcription:', transResult);
                if (transResult.success) {
                    this.state.isTranscribing = true;
                    console.log('✅ Transcription activée');
                } else {
                    console.warn('⚠️ Transcription non démarrée:', transResult.message);
                }
            } else {
                console.log('ℹ️ Transcription non demandée (checkbox non cochée)');
            }

            // Met à jour l'état
            this.state.isRecording = true;
            this.state.isPaused = false;
            this.state.recordingStartTime = Date.now();

            // Démarre le timer de mise à jour
            this.startUpdateTimer();

            // Sauvegarde l'état
            this.saveState();

            // Déclenche l'événement
            this.dispatchEvent('recordingStarted', {
                timestamp: new Date().toISOString(),
                config: this.audioRecorder.config
            });

            return { 
                success: true, 
                message: 'Enregistrement démarré avec succès',
                features: {
                    recording: true,
                    silenceDetection: this.state.isSilenceMonitoring,
                    transcription: this.state.isTranscribing
                }
            };
        } catch (error) {
            console.error('Erreur démarrage enregistrement:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Arrête l'enregistrement
     */
    async stopRecording() {
        if (!this.state.isRecording) {
            return { success: false, message: 'Aucun enregistrement en cours' };
        }

        try {
            // Arrête l'enregistrement
            const result = this.audioRecorder.stopRecording();

            // Arrête la détection de silence
            if (this.state.isSilenceMonitoring) {
                this.silenceDetector.stopMonitoring();
                this.state.isSilenceMonitoring = false;
            }

            // Arrête la transcription
            if (this.state.isTranscribing) {
                this.transcriptionService.stopTranscription();
                this.state.isTranscribing = false;
            }

            // Arrête le timer
            this.stopUpdateTimer();

            // Met à jour l'état
            this.state.isRecording = false;
            this.state.isPaused = false;

            // Sauvegarde l'état
            this.saveState();

            // Déclenche l'événement
            this.dispatchEvent('recordingStopped', {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.state.recordingStartTime
            });

            return result;
        } catch (error) {
            console.error('Erreur arrêt enregistrement:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Met en pause l'enregistrement
     */
    pauseRecording() {
        if (!this.state.isRecording || this.state.isPaused) {
            return { success: false, message: 'Impossible de mettre en pause' };
        }

        const result = this.audioRecorder.pauseRecording();
        if (result.success) {
            this.state.isPaused = true;
            
            // Met en pause la transcription
            if (this.state.isTranscribing) {
                console.log('⏸️ Pause de la transcription');
                this.transcriptionService.pauseTranscription();
            }
            
            this.saveState();
            
            this.dispatchEvent('recordingPaused', {
                timestamp: new Date().toISOString()
            });
        }

        return result;
    }

    /**
     * Reprend l'enregistrement
     */
    resumeRecording() {
        if (!this.state.isRecording || !this.state.isPaused) {
            return { success: false, message: 'Impossible de reprendre' };
        }

        const result = this.audioRecorder.resumeRecording();
        if (result.success) {
            this.state.isPaused = false;
            
            // Reprend la transcription
            if (this.state.isTranscribing) {
                console.log('▶️ Reprise de la transcription');
                this.transcriptionService.resumeTranscription();
            }
            
            this.saveState();
            
            this.dispatchEvent('recordingResumed', {
                timestamp: new Date().toISOString()
            });
        }

        return result;
    }

    /**
     * Gère la fin d'un enregistrement
     */
    handleRecordingComplete(recording) {
        console.log('✅ Enregistrement terminé:', recording.name);
        
        this.state.currentRecordingId = recording.id;
        this.saveState();

        // Notifie la vue
        this.dispatchEvent('recordingAdded', recording);

        // Génère un rapport si silences détectés
        if (this.state.isSilenceMonitoring) {
            const silenceStats = this.silenceDetector.getStatistics();
            if (silenceStats.unnatural > 0) {
                this.generateSilenceReport(recording, silenceStats);
            }
        }
    }

    /**
     * Gère la détection d'un silence
     */
    handleSilenceDetected(silence) {
        console.log('🔇 Silence détecté:', silence);
        
        this.dispatchEvent('silenceUpdate', silence);
    }

    /**
     * Gère une alerte de silence
     */
    async handleSilenceAlert(alert) {
        console.warn('⚠️ Controller: Alerte silence reçue:', alert);
        
        // Notifie la vue pour affichage d'une notification toast
        this.dispatchEvent('alertGenerated', alert);
    }

    /**
     * Gère une mise à jour de transcription
     */
    handleTranscriptionUpdate(data) {
        console.log('📝 Controller: Transcription reçue du Model:', data);
        this.dispatchEvent('transcriptionUpdated', data);
    }

    /**
     * Gère la fin d'une transcription
     */
    handleTranscriptionComplete(transcription) {
        console.log('📝 Transcription terminée');
        
        this.dispatchEvent('transcriptionFinished', transcription);
    }

    /**
     * Gère la détection d'une longue conversation
     */
    handleLongConversation(data) {
        console.log('💬 Longue conversation détectée');
        
        this.dispatchEvent('longConversationAlert', data);
    }



    /**
     * Récupère un enregistrement par son ID
     */
    getRecordingById(id) {
        const recordings = this.audioRecorder.getRecordings();
        return recordings.find(r => r.id === id);
    }

    /**
     * Télécharge un enregistrement
     */
    downloadRecording(recordingId, customName = null) {
        return this.audioRecorder.downloadRecording(recordingId, customName);
    }

    /**
     * Supprime un enregistrement
     */
    deleteRecording(recordingId) {
        const result = this.audioRecorder.deleteRecording(recordingId);
        
        if (result.success) {
            this.dispatchEvent('recordingDeleted', { id: recordingId });
        }

        return result;
    }

    /**
     * Renomme un enregistrement
     */
    renameRecording(recordingId, newName) {
        const result = this.audioRecorder.renameRecording(recordingId, newName);
        
        if (result.success) {
            this.dispatchEvent('recordingRenamed', { id: recordingId, name: newName });
        }

        return result;
    }

    /**
     * Exporte une transcription
     */
    exportTranscription(transcriptionId, format = 'txt') {
        return this.transcriptionService.exportTranscription(transcriptionId, format);
    }

    /**
     * Analyse une transcription
     */
    analyzeTranscription(transcriptionId) {
        return this.transcriptionService.analyzeTranscription(transcriptionId);
    }

    /**
     * Configure l'enregistrement
     */
    setRecordingConfig(config) {
        this.audioRecorder.setConfig(config);
        this.dispatchEvent('configUpdated', { type: 'recording', config });
        return { success: true, message: 'Configuration mise à jour' };
    }

    /**
     * Configure la détection de silence
     */
    setSilenceConfig(config) {
        this.silenceDetector.setConfig(config);
        this.dispatchEvent('configUpdated', { type: 'silence', config });
        return { success: true, message: 'Configuration mise à jour' };
    }

    /**
     * Configure la transcription
     */
    setTranscriptionConfig(config) {
        this.transcriptionService.setConfig(config);
        this.dispatchEvent('configUpdated', { type: 'transcription', config });
        return { success: true, message: 'Configuration mise à jour' };
    }



    /**
     * Génère un rapport de silence
     */
    generateSilenceReport(recording, silenceStats) {
        const report = {
            recording: {
                id: recording.id,
                name: recording.name,
                duration: recording.duration
            },
            silences: silenceStats,
            unnaturalSilences: this.silenceDetector.getUnnaturalSilences(),
            timestamp: new Date().toISOString()
        };

        this.dispatchEvent('silenceReportGenerated', report);
        return report;
    }

    /**
     * Génère un rapport quotidien
     */
    async generateDailyReport() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const recordings = this.audioRecorder.getRecordings().filter(r => 
            new Date(r.timestamp) >= today
        );

        const reportData = {
            date: new Date().toISOString(),
            totalRecordings: recordings.length,
            totalDuration: recordings.reduce((sum, r) => sum + r.duration, 0),
            recordings: recordings,
            silenceAlerts: this.silenceDetector.getUnnaturalSilences().length,
            silences: this.silenceDetector.getUnnaturalSilences(),
            transcriptions: this.transcriptionService.getTranscriptions().length
        };

        // Envoie le rapport par email
        if (this.emailService.config.enabled) {
            await this.emailService.sendDailyReport(reportData);
        }

        return reportData;
    }

    /**
     * Nettoie les enregistrements expirés
     */
    cleanupExpiredRecordings() {
        return this.audioRecorder.cleanExpiredRecordings();
    }

    /**
     * Démarre le nettoyage automatique planifié
     */
    startCleanupScheduler() {
        // Nettoie tous les jours à minuit
        const now = new Date();
        const night = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1, // Prochain jour
            0, 0, 0 // Minuit
        );
        const msToMidnight = night.getTime() - now.getTime();

        setTimeout(() => {
            this.cleanupExpiredRecordings();
            // Répète tous les jours
            this.cleanupTimer = setInterval(() => {
                this.cleanupExpiredRecordings();
            }, 24 * 60 * 60 * 1000);
        }, msToMidnight);
    }

    /**
     * Démarre le timer de mise à jour
     */
    startUpdateTimer() {
        this.updateTimer = setInterval(() => {
            if (this.state.isRecording && !this.state.isPaused) {
                this.dispatchEvent('recordingUpdate', {
                    duration: this.audioRecorder.getCurrentDuration(),
                    timestamp: new Date().toISOString()
                });
            }
        }, 1000);
    }

    /**
     * Arrête le timer de mise à jour
     */
    stopUpdateTimer() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Obtient l'état actuel
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Obtient toutes les données
     */
    getAllData() {
        return {
            recordings: this.audioRecorder.getRecordings(),
            transcriptions: this.transcriptionService.getTranscriptions(),
            silences: this.silenceDetector.getSilences(),
            silenceStats: this.silenceDetector.getStatistics(),
            state: this.state,
            configs: {
                recording: this.audioRecorder.getConfig(),
                silence: this.silenceDetector.config,
                transcription: this.transcriptionService.config
            }
        };
    }

    /**
     * Obtient les statistiques globales
     */
    getGlobalStatistics() {
        const recordings = this.audioRecorder.getRecordings();
        const totalDuration = recordings.reduce((sum, r) => sum + r.duration, 0);
        const totalSize = recordings.reduce((sum, r) => sum + r.size, 0);

        return {
            recordings: {
                total: recordings.length,
                totalDuration: totalDuration,
                totalSize: totalSize,
                avgDuration: recordings.length > 0 ? totalDuration / recordings.length : 0
            },
            silences: this.silenceDetector.getStatistics(),
            transcriptions: {
                total: this.transcriptionService.getTranscriptions().length
            }
        };
    }

    /**
     * Réinitialise toutes les données
     */
    resetAllData() {
        if (this.state.isRecording) {
            this.stopRecording();
        }

        this.silenceDetector.reset();
        this.emailService.clearQueue();

        return { success: true, message: 'Données réinitialisées' };
    }

    /**
     * Déclenche un événement personnalisé
     */
    dispatchEvent(eventName, detail = {}) {
        window.dispatchEvent(new CustomEvent(`audio:${eventName}`, { detail }));
    }

    /**
     * Sauvegarde l'état
     */
    saveState() {
        localStorage.setItem('audioControllerState', JSON.stringify(this.state));
    }

    /**
     * Charge l'état
     */
    loadState() {
        try {
            const stored = localStorage.getItem('audioControllerState');
            if (stored) {
                this.state = { ...this.state, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Erreur chargement état:', error);
        }
    }

    /**
     * Nettoie les ressources
     */
    cleanup() {
        if (this.state.isRecording) {
            this.stopRecording();
        }

        this.stopUpdateTimer();
        
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.silenceDetector.cleanup();
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioController;
}

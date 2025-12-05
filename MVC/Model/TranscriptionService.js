/**
 * TranscriptionService Model
 * Service de transcription audio vers texte avec IA
 */

class TranscriptionService {
    constructor() {
        this.isTranscribing = false;
        this.isPaused = false;
        this.transcriptions = [];
        
        // Configuration
        this.config = {
            language: 'fr-FR',
            continuous: true,
            interimResults: true,
            maxAlternatives: 1,
            enableAI: true,
            enableConversationDetection: true,
            conversationThreshold: 300000, // 5 minutes - seuil pour longue conversation
            autoSegmentation: true,
            segmentMaxDuration: 600000 // 10 minutes max par segment
        };

        // Support Web Speech API
        this.recognition = null;
        this.initRecognition();
        
        this.loadConfig();
    }

    /**
     * Initialise la reconnaissance vocale
     */
    initRecognition() {
        console.log('🔍 Vérification Web Speech API...');
        console.log('  - window.webkitSpeechRecognition:', typeof window.webkitSpeechRecognition);
        console.log('  - window.SpeechRecognition:', typeof window.SpeechRecognition);
        console.log('  - Navigateur:', navigator.userAgent);
        
        if ('webkitSpeechRecognition' in window) {
            console.log('✅ webkitSpeechRecognition détecté');
            this.recognition = new window.webkitSpeechRecognition();
            this.setupRecognition();
        } else if ('SpeechRecognition' in window) {
            console.log('✅ SpeechRecognition détecté');
            this.recognition = new window.SpeechRecognition();
            this.setupRecognition();
        } else {
            console.error('❌ Web Speech API non supportée par ce navigateur');
            console.log('ℹ️ Navigateurs compatibles:');
            console.log('  - Google Chrome (recommandé)');
            console.log('  - Microsoft Edge');
            console.log('  - Safari (Mac/iOS)');
            console.log('❌ Navigateurs NON compatibles:');
            console.log('  - Mozilla Firefox');
            console.log('  - Opera');
        }
    }

    /**
     * Configure la reconnaissance vocale
     */
    setupRecognition() {
        if (!this.recognition) {
            console.error('❌ setupRecognition: recognition est null');
            return;
        }

        console.log('⚙️ Configuration de la reconnaissance vocale...');
        
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;
        this.recognition.lang = this.config.language;
        this.recognition.maxAlternatives = this.config.maxAlternatives;
        
        // Réduit le délai pour un affichage plus rapide (non standard mais supporté par Chrome/Edge)
        if ('interimResultsMaxWait' in this.recognition) {
            this.recognition.interimResultsMaxWait = 500; // 500ms au lieu de ~1000ms par défaut
        }

        // Gestionnaires d'événements
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);
        this.recognition.onend = () => this.handleEnd();
        this.recognition.onstart = () => this.handleStart();
        
        console.log('✅ Reconnaissance vocale configurée:', {
            language: this.config.language,
            continuous: this.config.continuous,
            interimResults: this.config.interimResults
        });
    }

    /**
     * Démarre la transcription en temps réel
     */
    startTranscription() {
        if (!this.recognition) {
            return { 
                success: false, 
                message: 'Reconnaissance vocale non disponible (utilisez Chrome, Edge ou Safari)' 
            };
        }

        // Vérifie si déjà en cours
        if (this.isTranscribing) {
            return { 
                success: false, 
                message: 'Transcription déjà en cours' 
            };
        }

        try {
            this.isTranscribing = true;
            this.currentTranscription = {
                id: Date.now(),
                startTime: new Date().toISOString(),
                segments: [],
                fullText: '',
                isLongConversation: false
            };
            
            console.log('🎤 Démarrage de la reconnaissance vocale...');
            // Force la langue à chaque démarrage pour garantir l'application de la config
            this.recognition.lang = this.config.language;
            console.log('🌐 Langue appliquée:', this.recognition.lang);
            this.recognition.start();
            
            return { success: true, message: 'Transcription démarrée' };
        } catch (error) {
            console.error('Erreur démarrage transcription:', error);
            this.isTranscribing = false;
            return { success: false, message: error.message };
        }
    }

    /**
     * Arrête la transcription
     */
    stopTranscription() {
        if (!this.recognition || !this.isTranscribing) {
            return { success: false, message: 'Aucune transcription en cours' };
        }

        try {
            this.isTranscribing = false;
            this.recognition.stop();
            
            // Finalise et sauvegarde la transcription en cours
            if (this.currentTranscription && this.currentTranscription.fullText) {
                const finalTranscription = {
                    ...this.currentTranscription,
                    endTime: new Date().toISOString(),
                    duration: Date.now() - new Date(this.currentTranscription.startTime).getTime()
                };
                
                this.transcriptions.push(finalTranscription);
                this.saveTranscriptions();
                
                console.log('💾 Transcription sauvegardée:', {
                    mots: finalTranscription.fullText.split(' ').length,
                    segments: finalTranscription.segments.length,
                    durée: (finalTranscription.duration / 1000).toFixed(1) + 's'
                });
                
                // Notifie la vue
                window.dispatchEvent(new CustomEvent('transcriptionSaved', {
                    detail: finalTranscription
                }));
            }
            
            this.currentTranscription = null;
            
            console.log('⏹️ Transcription arrêtée');
            return { success: true, message: 'Transcription arrêtée' };
        } catch (error) {
            console.error('Erreur arrêt transcription:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Met en pause la transcription (arrête la reconnaissance)
     */
    pauseTranscription() {
        if (!this.recognition || !this.isTranscribing) {
            return { success: false, message: 'Aucune transcription en cours' };
        }

        try {
            // Marque comme en pause mais garde isTranscribing à true
            this.isPaused = true;
            this.recognition.stop(); // Arrête temporairement la reconnaissance
            console.log('⏸️ Transcription en pause');
            return { success: true, message: 'Transcription en pause' };
        } catch (error) {
            console.error('Erreur pause transcription:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Reprend la transcription
     */
    resumeTranscription() {
        if (!this.recognition || !this.isTranscribing || !this.isPaused) {
            return { success: false, message: 'Aucune transcription en pause' };
        }

        try {
            this.isPaused = false;
            // Force la langue avant la reprise
            this.recognition.lang = this.config.language;
            console.log('🌐 Langue appliquée:', this.recognition.lang);
            this.recognition.start(); // Redémarre la reconnaissance
            console.log('▶️ Transcription reprise');
            return { success: true, message: 'Transcription reprise' };
        } catch (error) {
            console.error('Erreur reprise transcription:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Gère les résultats de reconnaissance
     */
    handleResult(event) {
        if (!this.currentTranscription) {
            console.warn('Pas de transcription active');
            return;
        }

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
                
                // Ajoute le segment
                const segment = {
                    text: transcript,
                    timestamp: new Date().toISOString(),
                    confidence: event.results[i][0].confidence,
                    isFinal: true
                };
                
                this.currentTranscription.segments.push(segment);
                this.currentTranscription.fullText += transcript + ' ';

                console.log('📝 Transcription:', transcript);

                // Vérifie si c'est une longue conversation
                this.checkConversationLength();

                // Auto-segmentation si nécessaire
                if (this.config.autoSegmentation) {
                    this.checkSegmentation();
                }
            } else {
                interimTranscript += transcript;
            }
        }

        // Déclenche un événement avec les résultats
        window.dispatchEvent(new CustomEvent('transcriptionUpdate', {
            detail: {
                final: finalTranscript.trim(),
                interim: interimTranscript,
                fullText: this.currentTranscription.fullText.trim(),
                segmentCount: this.currentTranscription.segments.length
            }
        }));
    }

    /**
     * Vérifie si c'est une longue conversation
     */
    checkConversationLength() {
        if (!this.config.enableConversationDetection) return;

        const startTime = new Date(this.currentTranscription.startTime).getTime();
        const duration = Date.now() - startTime;

        if (duration >= this.config.conversationThreshold) {
            this.currentTranscription.isLongConversation = true;
            
            window.dispatchEvent(new CustomEvent('longConversationDetected', {
                detail: {
                    duration: duration,
                    segmentCount: this.currentTranscription.segments.length,
                    wordCount: this.currentTranscription.fullText.split(' ').length
                }
            }));
        }
    }

    /**
     * Vérifie s'il faut segmenter la transcription
     */
    checkSegmentation() {
        const startTime = new Date(this.currentTranscription.startTime).getTime();
        const duration = Date.now() - startTime;

        if (duration >= this.config.segmentMaxDuration) {
            this.saveCurrentSegment();
            this.startNewSegment();
        }
    }

    /**
     * Sauvegarde le segment actuel
     */
    saveCurrentSegment() {
        if (!this.currentTranscription) return;

        const segment = {
            ...this.currentTranscription,
            endTime: new Date().toISOString(),
            duration: Date.now() - new Date(this.currentTranscription.startTime).getTime()
        };

        this.transcriptions.push(segment);
        this.saveTranscriptions();

        window.dispatchEvent(new CustomEvent('segmentSaved', {
            detail: segment
        }));
    }

    /**
     * Démarre un nouveau segment
     */
    startNewSegment() {
        this.currentTranscription = {
            id: Date.now(),
            startTime: new Date().toISOString(),
            segments: [],
            fullText: '',
            isLongConversation: false,
            isSegmented: true,
            previousSegmentId: this.currentTranscription.id
        };
    }

    /**
     * Gère les erreurs de reconnaissance
     */
    handleError(event) {
        console.error('❌ Erreur reconnaissance vocale:', event.error);
        
        const errorMessage = this.getErrorMessage(event.error);
        
        window.dispatchEvent(new CustomEvent('transcriptionError', {
            detail: {
                error: event.error,
                message: errorMessage
            }
        }));

        // Redémarre automatiquement si erreur temporaire
        if (event.error === 'no-speech') {
            console.log('⚠️ Pas de parole détectée, redémarrage...');
            setTimeout(() => {
                if (this.isTranscribing) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.error('Erreur redémarrage:', e);
                    }
                }
            }, 1000);
        } else if (event.error === 'aborted' && this.isTranscribing) {
            // Redémarre si arrêt inattendu
            setTimeout(() => {
                if (this.isTranscribing) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.error('Erreur redémarrage:', e);
                    }
                }
            }, 1000);
        }
    }

    /**
     * Obtient un message d'erreur lisible
     */
    getErrorMessage(error) {
        const messages = {
            'no-speech': 'Aucun son détecté - parlez plus fort ou rapprochez-vous du micro',
            'audio-capture': 'Impossible de capturer l\'audio - vérifiez votre microphone',
            'not-allowed': 'Permission microphone refusée - autorisez l\'accès dans les paramètres du navigateur',
            'network': 'Erreur réseau - vérifiez votre connexion Internet',
            'aborted': 'Reconnaissance interrompue',
            'service-not-allowed': 'Service non autorisé'
        };
        return messages[error] || `Erreur inconnue: ${error}`;
    }

    /**
     * Gère le démarrage de la reconnaissance
     */
    handleStart() {
        console.log('✅ Reconnaissance vocale démarrée');
        
        window.dispatchEvent(new CustomEvent('transcriptionStarted', {
            detail: {
                language: this.config.language,
                continuous: this.config.continuous
            }
        }));
    }

    /**
     * Gère la fin de la reconnaissance
     */
    handleEnd() {
        console.log('⏹️ Reconnaissance vocale terminée');
        
        // Ne redémarre que si en cours ET pas en pause
        if (this.isTranscribing && !this.isPaused) {
            // Redémarre automatiquement en mode continu
            console.log('🔄 Redémarrage automatique de la reconnaissance...');
            setTimeout(() => {
                if (this.isTranscribing && !this.isPaused) {
                    try {
                        // Force la langue avant le redémarrage
                        this.recognition.lang = this.config.language;
                        this.recognition.start();
                    } catch (error) {
                        console.error('Erreur redémarrage:', error);
                        // Si erreur de redémarrage, attendre plus longtemps
                        setTimeout(() => {
                            if (this.isTranscribing && !this.isPaused) {
                                try {
                                    // Force la langue avant le redémarrage
                                    this.recognition.lang = this.config.language;
                                    this.recognition.start();
                                } catch (e) {
                                    console.error('Échec définitif du redémarrage:', e);
                                    this.isTranscribing = false;
                                }
                            }
                        }, 2000);
                    }
                }
            }, 500);
        } else if (this.isPaused) {
            console.log('⏸️ Transcription en pause - pas de redémarrage automatique');
        }
    }

    /**
     * Transcrit un fichier audio existant (simulation - nécessite API externe)
     */
    async transcribeFile(audioBlob) {
        // Cette fonction nécessiterait une API externe comme:
        // - Google Cloud Speech-to-Text
        // - Azure Speech Services
        // - AWS Transcribe
        // - OpenAI Whisper API

        return {
            success: false,
            message: 'La transcription de fichiers nécessite une API externe (Google Speech, Azure, OpenAI Whisper, etc.)',
            recommendation: 'Intégrez une API de transcription pour cette fonctionnalité'
        };
    }

    /**
     * Analyse une transcription avec IA
     */
    analyzeTranscription(transcriptionId) {
        const transcription = this.transcriptions.find(t => t.id === transcriptionId);
        if (!transcription) {
            return { success: false, message: 'Transcription introuvable' };
        }

        const analysis = {
            wordCount: transcription.fullText.split(' ').filter(w => w.length > 0).length,
            characterCount: transcription.fullText.length,
            segmentCount: transcription.segments.length,
            avgConfidence: this.calculateAvgConfidence(transcription.segments),
            keywords: this.extractKeywords(transcription.fullText),
            sentiment: this.analyzeSentiment(transcription.fullText),
            topics: this.extractTopics(transcription.fullText)
        };

        return { success: true, analysis: analysis };
    }

    /**
     * Calcule la confiance moyenne
     */
    calculateAvgConfidence(segments) {
        if (segments.length === 0) return 0;
        const sum = segments.reduce((acc, s) => acc + (s.confidence || 0), 0);
        return (sum / segments.length).toFixed(2);
    }

    /**
     * Extrait les mots-clés
     */
    extractKeywords(text) {
        // Supprime les mots courants
        const stopWords = ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'et', 'à', 'en', 'dans', 'pour', 'sur', 'avec'];
        const words = text.toLowerCase().split(/\s+/);
        const wordCount = {};

        words.forEach(word => {
            word = word.replace(/[.,!?;:]/g, '');
            if (word.length > 3 && !stopWords.includes(word)) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    }

    /**
     * Analyse le sentiment (basique - à améliorer avec vraie IA)
     */
    analyzeSentiment(text) {
        const positiveWords = ['bien', 'bon', 'excellent', 'super', 'merci', 'parfait', 'génial'];
        const negativeWords = ['mal', 'mauvais', 'problème', 'erreur', 'difficile', 'impossible'];

        const words = text.toLowerCase().split(/\s+/);
        let positiveCount = 0;
        let negativeCount = 0;

        words.forEach(word => {
            if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
            if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
        });

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    /**
     * Extrait les thèmes principaux
     */
    extractTopics(text) {
        // Détection basique de thèmes
        const topics = [];
        const topicKeywords = {
            'technique': ['système', 'serveur', 'code', 'programme', 'développement'],
            'réunion': ['réunion', 'décision', 'projet', 'équipe', 'planning'],
            'émission': ['émission', 'radio', 'antenne', 'programme', 'diffusion']
        };

        const lowerText = text.toLowerCase();
        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
            const matches = keywords.filter(kw => lowerText.includes(kw)).length;
            if (matches > 0) {
                topics.push({ topic, relevance: matches });
            }
        });

        return topics.sort((a, b) => b.relevance - a.relevance);
    }

    /**
     * Exporte une transcription
     */
    exportTranscription(transcriptionId, format = 'txt') {
        const transcription = this.transcriptions.find(t => t.id === transcriptionId);
        if (!transcription) {
            return { success: false, message: 'Transcription introuvable' };
        }

        let content = '';
        let mimeType = '';
        let extension = '';

        switch (format) {
            case 'txt':
                content = transcription.fullText;
                mimeType = 'text/plain';
                extension = 'txt';
                break;
            case 'json':
                content = JSON.stringify(transcription, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
            case 'srt': // Sous-titres
                content = this.convertToSRT(transcription);
                mimeType = 'text/plain';
                extension = 'srt';
                break;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transcription_${transcription.id}.${extension}`;
        link.click();
        URL.revokeObjectURL(url);

        return { success: true, message: 'Transcription exportée' };
    }

    /**
     * Convertit en format SRT (sous-titres)
     */
    convertToSRT(transcription) {
        let srt = '';
        transcription.segments.forEach((segment, index) => {
            const start = new Date(segment.timestamp);
            const end = new Date(start.getTime() + 5000); // 5 secondes par défaut
            
            srt += `${index + 1}\n`;
            srt += `${this.formatSRTTime(start)} --> ${this.formatSRTTime(end)}\n`;
            srt += `${segment.text}\n\n`;
        });
        return srt;
    }

    /**
     * Formate le temps pour SRT
     */
    formatSRTTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const ms = String(date.getMilliseconds()).padStart(3, '0');
        return `${hours}:${minutes}:${seconds},${ms}`;
    }

    /**
     * Configure les paramètres
     */
    setConfig(newConfig) {
        console.log('⚙️ TranscriptionService: Nouvelle configuration reçue:', newConfig);
        const oldLang = this.config.language;
        this.config = { ...this.config, ...newConfig };
        if (this.recognition) {
            this.setupRecognition();
            console.log('🔄 Recognition reconfigurée');
        }
        this.saveConfig();
        console.log('✅ TranscriptionService: Configuration mise à jour:', {
            language: `${oldLang} → ${this.config.language}`,
            conversationThreshold: (this.config.conversationThreshold / 60000) + ' min'
        });
    }

    /**
     * Sauvegarde les transcriptions
     */
    saveTranscriptions() {
        const data = this.transcriptions.map(t => ({
            ...t,
            segments: t.segments.slice(0, 100) // Limite pour le stockage
        }));
        localStorage.setItem('transcriptions', JSON.stringify(data));
    }

    /**
     * Charge les transcriptions
     */
    loadTranscriptions() {
        try {
            const stored = localStorage.getItem('transcriptions');
            if (stored) {
                this.transcriptions = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Erreur chargement transcriptions:', error);
        }
    }

    /**
     * Sauvegarde la configuration
     */
    saveConfig() {
        localStorage.setItem('transcriptionConfig', JSON.stringify(this.config));
    }

    /**
     * Charge la configuration
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem('transcriptionConfig');
            if (stored) {
                const savedConfig = JSON.parse(stored);
                this.config = { ...this.config, ...savedConfig };
                console.log('📂 TranscriptionService: Configuration chargée depuis localStorage:', {
                    language: this.config.language,
                    conversationThreshold: (this.config.conversationThreshold / 60000) + ' min'
                });
            } else {
                console.log('🆕 TranscriptionService: Utilisation de la configuration par défaut');
            }
        } catch (error) {
            console.error('Erreur chargement config transcription:', error);
        }
    }

    /**
     * Obtient toutes les transcriptions
     */
    getTranscriptions() {
        return this.transcriptions;
    }

    /**
     * Supprime une transcription
     */
    deleteTranscription(transcriptionId) {
        const index = this.transcriptions.findIndex(t => t.id === transcriptionId);
        if (index !== -1) {
            this.transcriptions.splice(index, 1);
            this.saveTranscriptions();
            return { success: true, message: 'Transcription supprimée' };
        }
        return { success: false, message: 'Transcription introuvable' };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranscriptionService;
}

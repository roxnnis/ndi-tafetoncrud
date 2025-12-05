/**
 * AudioRecorder Model
 * Gère l'enregistrement audio avec configuration personnalisable
 */

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioStream = null;
        this.isRecording = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.recordings = this.loadRecordings();
        
        // Configuration par défaut
        this.config = {
            format: 'audio/webm;codecs=opus', // Formats: webm, mp4, wav
            audioBitsPerSecond: 128000, // Qualité: 64000, 128000, 192000, 256000
            maxDuration: 3600000, // Durée maximale en ms (1h par défaut)
            retentionDays: 30, // Durée de vie des fichiers
            silenceDetection: true,
            silenceThreshold: -50, // dB
            silenceDuration: 3000, // ms
            autoStop: true
        };
    }

    /**
     * Configure les paramètres d'enregistrement
     */
    setConfig(newConfig) {
        console.log('⚙️ AudioRecorder: Nouvelle configuration reçue:', newConfig);
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        console.log('✅ AudioRecorder: Configuration mise à jour:', {
            format: this.config.format,
            bitrate: this.config.audioBitsPerSecond + ' bps',
            maxDuration: (this.config.maxDuration / 60000) + ' min'
        });
    }

    /**
     * Démarre l'enregistrement audio
     */
    async startRecording() {
        try {
            // Réutilise le stream existant ou en demande un nouveau
            if (!this.audioStream || !this.audioStream.active) {
                console.log('🎤 Demande d\'accès au microphone...');
                this.audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                console.log('✅ Microphone autorisé');
            } else {
                console.log('♻️ Réutilisation du stream audio existant');
            }

            // Configuration du MediaRecorder
            let mimeType = this.config.format;
            
            // Vérifie le support du format demandé
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                console.warn('⚠️ Format', mimeType, 'non supporté, tentative de fallback...');
                
                // Essaie des formats alternatifs
                const fallbacks = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/ogg;codecs=opus',
                    'audio/mp4'
                ];
                
                for (const format of fallbacks) {
                    if (MediaRecorder.isTypeSupported(format)) {
                        mimeType = format;
                        console.log('✅ Utilisation du format:', format);
                        break;
                    }
                }
            } else {
                console.log('✅ Format supporté:', mimeType);
            }
            
            const options = {
                mimeType: mimeType,
                audioBitsPerSecond: this.config.audioBitsPerSecond
            };

            this.mediaRecorder = new MediaRecorder(this.audioStream, options);
            this.audioChunks = [];
            this.actualMimeType = this.mediaRecorder.mimeType; // Stocke le format réel utilisé
            console.log('🎤 MediaRecorder créé avec mimeType:', this.actualMimeType);

            // Gestion des événements
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.handleRecordingStop();
            };

            this.mediaRecorder.start(1000); // Collecte les données toutes les secondes
            this.isRecording = true;
            this.isPaused = false;
            this.startTime = Date.now();

            // Auto-stop après la durée maximale
            if (this.config.autoStop) {
                setTimeout(() => {
                    if (this.isRecording) {
                        this.stopRecording();
                    }
                }, this.config.maxDuration);
            }

            return { success: true, message: 'Enregistrement démarré' };
        } catch (error) {
            console.error('Erreur lors du démarrage:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Met en pause l'enregistrement
     */
    pauseRecording() {
        if (this.mediaRecorder && this.isRecording && !this.isPaused) {
            this.mediaRecorder.pause();
            this.isPaused = true;
            this.pausedTime = Date.now();
            return { success: true, message: 'Enregistrement en pause' };
        }
        return { success: false, message: 'Impossible de mettre en pause' };
    }

    /**
     * Reprend l'enregistrement
     */
    resumeRecording() {
        if (this.mediaRecorder && this.isRecording && this.isPaused) {
            this.mediaRecorder.resume();
            this.isPaused = false;
            return { success: true, message: 'Enregistrement repris' };
        }
        return { success: false, message: 'Impossible de reprendre' };
    }

    /**
     * Arrête l'enregistrement
     */
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.isPaused = false;
            
            // NE PAS arrêter le stream audio pour pouvoir le réutiliser
            // Le stream sera fermé uniquement lors de cleanup() ou destruction
            
            return { success: true, message: 'Enregistrement arrêté' };
        }
        return { success: false, message: 'Aucun enregistrement en cours' };
    }

    /**
     * Traite l'arrêt de l'enregistrement
     */
    handleRecordingStop() {
        // Utilise le mimeType réellement utilisé par le MediaRecorder
        const actualFormat = this.actualMimeType || this.mediaRecorder.mimeType || this.config.format;
        const audioBlob = new Blob(this.audioChunks, { type: actualFormat });
        const duration = Date.now() - this.startTime;
        
        console.log('💾 Création du Blob avec format:', actualFormat, 'Taille:', audioBlob.size, 'bytes');
        
        const recording = {
            id: Date.now(),
            blob: audioBlob,
            url: URL.createObjectURL(audioBlob),
            format: actualFormat,
            size: audioBlob.size,
            duration: duration,
            timestamp: new Date().toISOString(),
            name: `Enregistrement_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}_${new Date().toLocaleTimeString('fr-FR').replace(/:/g, '-')}`,
            retentionDate: new Date(Date.now() + (this.config.retentionDays * 24 * 60 * 60 * 1000)).toISOString()
        };

        this.recordings.push(recording);
        this.saveRecordings();
        
        // Déclenche un événement personnalisé
        window.dispatchEvent(new CustomEvent('recordingComplete', { 
            detail: recording 
        }));
    }

    /**
     * Télécharge un enregistrement
     */
    downloadRecording(recordingId, customName = null) {
        const recording = this.recordings.find(r => r.id === recordingId);
        if (!recording) {
            return { success: false, message: 'Enregistrement introuvable' };
        }

        const link = document.createElement('a');
        link.href = recording.url;
        
        const extension = this.getFileExtension(recording.format);
        const fileName = customName 
            ? `${customName}.${extension}` 
            : `${recording.name}.${extension}`;
        
        link.download = fileName;
        link.click();

        return { success: true, message: 'Téléchargement démarré' };
    }

    /**
     * Supprime un enregistrement
     */
    deleteRecording(recordingId) {
        const index = this.recordings.findIndex(r => r.id === recordingId);
        if (index !== -1) {
            URL.revokeObjectURL(this.recordings[index].url);
            this.recordings.splice(index, 1);
            this.saveRecordings();
            return { success: true, message: 'Enregistrement supprimé' };
        }
        return { success: false, message: 'Enregistrement introuvable' };
    }

    /**
     * Renomme un enregistrement
     */
    renameRecording(recordingId, newName) {
        const recording = this.recordings.find(r => r.id === recordingId);
        if (recording) {
            recording.name = newName;
            this.saveRecordings();
            return { success: true, message: 'Enregistrement renommé' };
        }
        return { success: false, message: 'Enregistrement introuvable' };
    }

    /**
     * Nettoie les enregistrements expirés
     */
    cleanExpiredRecordings() {
        const now = new Date();
        const expiredRecordings = this.recordings.filter(r => 
            new Date(r.retentionDate) < now
        );

        expiredRecordings.forEach(r => {
            URL.revokeObjectURL(r.url);
        });

        this.recordings = this.recordings.filter(r => 
            new Date(r.retentionDate) >= now
        );

        this.saveRecordings();
        return {
            success: true,
            message: `${expiredRecordings.length} enregistrement(s) expiré(s) supprimé(s)`
        };
    }

    /**
     * Obtient l'extension de fichier selon le format
     */
    getFileExtension(mimeType) {
        // Extrait le type principal du mimeType (avant le point-virgule)
        const baseType = mimeType.split(';')[0].trim();
        
        const extensions = {
            'audio/webm': 'webm',
            'audio/mp4': 'm4a',
            'audio/wav': 'wav',
            'audio/ogg': 'ogg',
            'audio/mpeg': 'mp3',
            'audio/aac': 'aac'
        };
        
        return extensions[baseType] || 'webm';
    }

    /**
     * Sauvegarde les enregistrements (sans les blobs)
     */
    saveRecordings() {
        const recordingsData = this.recordings.map(r => ({
            id: r.id,
            format: r.format,
            size: r.size,
            duration: r.duration,
            timestamp: r.timestamp,
            name: r.name,
            retentionDate: r.retentionDate
        }));
        localStorage.setItem('audioRecordings', JSON.stringify(recordingsData));
    }

    /**
     * Charge les enregistrements depuis le stockage
     */
    loadRecordings() {
        try {
            const stored = localStorage.getItem('audioRecordings');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            return [];
        }
    }

    /**
     * Sauvegarde la configuration
     */
    saveConfig() {
        localStorage.setItem('audioRecorderConfig', JSON.stringify(this.config));
    }

    /**
     * Charge la configuration
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem('audioRecorderConfig');
            if (stored) {
                const savedConfig = JSON.parse(stored);
                this.config = { ...this.config, ...savedConfig };
                console.log('📂 AudioRecorder: Configuration chargée depuis localStorage:', {
                    format: this.config.format,
                    bitrate: this.config.audioBitsPerSecond + ' bps'
                });
            } else {
                console.log('🆕 AudioRecorder: Utilisation de la configuration par défaut');
            }
        } catch (error) {
            console.error('Erreur chargement config:', error);
        }
    }

    /**
     * Obtient la durée actuelle de l'enregistrement
     */
    getCurrentDuration() {
        if (!this.isRecording) return 0;
        return Date.now() - this.startTime;
    }

    /**
     * Obtient tous les enregistrements
     */
    getRecordings() {
        return this.recordings;
    }

    /**
     * Obtient la configuration actuelle
     */
    getConfig() {
        return this.config;
    }

    /**
     * Nettoie les ressources (ferme le stream audio)
     * À appeler uniquement lors de la fermeture de l'application
     */
    cleanup() {
        console.log('🧹 Nettoyage des ressources AudioRecorder...');
        
        // Arrête l'enregistrement si en cours
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // Ferme le stream audio
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => {
                track.stop();
                console.log('⏹️ Track audio fermé:', track.label);
            });
            this.audioStream = null;
        }
        
        console.log('✅ Nettoyage terminé');
    }
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioRecorder;
}

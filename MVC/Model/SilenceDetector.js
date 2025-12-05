/**
 * SilenceDetector Model
 * Détecte les silences dans l'audio avec IA pour distinguer les blancs naturels/non-naturels
 */

class SilenceDetector {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.silences = [];
        this.isMonitoring = false;
        this.lastSoundTime = Date.now();
        this.lastLogTime = null;
        
        // Configuration
        this.config = {
            threshold: -40, // Seuil en dB (plus le nombre est proche de 0, plus c'est sensible)
            minSilenceDuration: 3000, // Durée minimale du silence (ms)
            naturalSilenceMaxDuration: 5000, // Durée max d'un blanc naturel (ms)
            checkInterval: 100, // Intervalle de vérification (ms)
            enableAIDetection: true,
            notificationThreshold: 10000 // Notification si silence > 10s
        };

        this.loadConfig();
    }

    /**
     * Configure les paramètres de détection
     */
    setConfig(newConfig) {
        console.log('⚙️ SilenceDetector: Nouvelle configuration reçue:', newConfig);
        const oldThreshold = this.config.threshold;
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        console.log('✅ SilenceDetector: Configuration mise à jour:', {
            threshold: `${oldThreshold} → ${this.config.threshold} dB`,
            minSilenceDuration: this.config.minSilenceDuration + ' ms',
            emailThreshold: this.config.emailThreshold + ' ms'
        });
    }

    /**
     * Initialise le contexte audio pour l'analyse
     */
    async initialize(audioStream) {
        try {
            console.log('🔧 Initialisation du détecteur de blancs...');
            
            if (!audioStream) {
                throw new Error('Aucun stream audio fourni');
            }
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            const source = this.audioContext.createMediaStreamSource(audioStream);
            source.connect(this.analyser);

            console.log('✅ Détecteur de blancs initialisé avec succès');
            return { success: true, message: 'Détecteur initialisé' };
        } catch (error) {
            console.error('❌ Erreur initialisation détecteur:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Démarre la surveillance des silences
     */
    startMonitoring() {
        if (!this.analyser) {
            console.error('❌ SilenceDetector: analyser non initialisé');
            return { success: false, message: 'Détecteur non initialisé' };
        }

        this.isMonitoring = true;
        this.silences = [];
        this.lastSoundTime = Date.now();
        this.currentSilence = null;
        this.lastLogTime = null;

        console.log('✅ Détection de blancs démarrée avec config:', {
            threshold: this.config.threshold + ' dB',
            minDuration: this.config.minSilenceDuration + ' ms',
            checkInterval: this.config.checkInterval + ' ms'
        });

        this.monitoringInterval = setInterval(() => {
            this.checkSilence();
        }, this.config.checkInterval);

        return { success: true, message: 'Surveillance démarrée' };
    }

    /**
     * Arrête la surveillance
     */
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        // Finalise le silence en cours
        if (this.currentSilence) {
            this.finalizeSilence();
        }

        return { success: true, message: 'Surveillance arrêtée' };
    }

    /**
     * Vérifie le niveau sonore actuel
     */
    checkSilence() {
        if (!this.analyser) return;

        this.analyser.getByteTimeDomainData(this.dataArray);

        // Calcule le volume RMS
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            const normalized = (this.dataArray[i] - 128) / 128;
            sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / this.dataArray.length);
        // Évite -Infinity en ajoutant un plancher minimum
        const db = rms > 0 ? 20 * Math.log10(Math.max(rms, 0.0001)) : -100;

        const now = Date.now();
        const isSilent = db < this.config.threshold;
        
        // Log périodique pour débogage (toutes les 5 secondes)
        if (!this.lastLogTime || now - this.lastLogTime > 5000) {
            console.log('🔊 Niveau audio:', {
                db: db.toFixed(2),
                rms: rms.toFixed(4),
                threshold: this.config.threshold,
                isSilent: isSilent,
                silenceEnCours: !!this.currentSilence
            });
            this.lastLogTime = now;
        }

        if (isSilent) {
            // Début d'un nouveau silence
            if (!this.currentSilence) {
                this.currentSilence = {
                    startTime: now,
                    startTimestamp: new Date().toISOString(),
                    avgDb: db,
                    samples: 1
                };
            } else {
                // Mise à jour du silence en cours
                this.currentSilence.avgDb = 
                    (this.currentSilence.avgDb * this.currentSilence.samples + db) / 
                    (this.currentSilence.samples + 1);
                this.currentSilence.samples++;

                // Vérification pour alerte
                const silenceDuration = now - this.currentSilence.startTime;
                if (silenceDuration >= this.config.notificationThreshold &&
                    !this.currentSilence.alertSent) {
                    this.triggerAlert(this.currentSilence, silenceDuration);
                    this.currentSilence.alertSent = true;
                }
            }
        } else {
            // Son détecté
            if (this.currentSilence) {
                const silenceDuration = now - this.currentSilence.startTime;
                
                // Enregistre uniquement si le silence dépasse la durée minimale
                if (silenceDuration >= this.config.minSilenceDuration) {
                    this.finalizeSilence();
                } else {
                    this.currentSilence = null;
                }
            }
            this.lastSoundTime = now;
        }
    }

    /**
     * Finalise et enregistre un silence détecté
     */
    finalizeSilence() {
        if (!this.currentSilence) return;

        const endTime = Date.now();
        const duration = endTime - this.currentSilence.startTime;

        const silence = {
            id: Date.now(),
            startTime: this.currentSilence.startTime,
            endTime: endTime,
            duration: duration,
            timestamp: this.currentSilence.startTimestamp,
            avgDb: this.currentSilence.avgDb,
            type: this.classifySilence(duration),
            alertSent: this.currentSilence.alertSent || false
        };

        // Classification IA si activée
        if (this.config.enableAIDetection) {
            silence.aiClassification = this.aiClassify(silence);
        }

        this.silences.push(silence);
        
        console.log('🔇 Silence détecté:', {
            durée: (duration / 1000).toFixed(1) + 's',
            type: silence.type,
            avgDb: silence.avgDb.toFixed(2) + ' dB'
        });
        
        this.currentSilence = null;

        // Déclenche un événement
        window.dispatchEvent(new CustomEvent('silenceDetected', { 
            detail: silence 
        }));
    }

    /**
     * Classifie un silence (naturel ou non-naturel)
     */
    classifySilence(duration) {
        // Classification basique
        if (duration <= this.config.naturalSilenceMaxDuration) {
            return 'natural';
        }
        return 'unnatural';
    }

    /**
     * Classification IA avancée (simulation - à remplacer par une vraie IA)
     */
    aiClassify(silence) {
        // Facteurs à considérer pour l'IA:
        // 1. Durée du silence
        // 2. Niveau de dB moyen
        // 3. Contexte (position dans l'enregistrement)
        // 4. Pattern des silences précédents

        const features = {
            duration: silence.duration,
            avgDb: silence.avgDb,
            position: silence.startTime,
            previousSilences: this.silences.length
        };

        // Score de confiance (0-1)
        let confidence = 0.5;

        // Facteur durée
        if (silence.duration > this.config.naturalSilenceMaxDuration * 2) {
            confidence += 0.3;
        } else if (silence.duration < this.config.naturalSilenceMaxDuration) {
            confidence -= 0.2;
        }

        // Facteur niveau sonore
        if (silence.avgDb < this.config.threshold - 10) {
            confidence += 0.1; // Silence très profond = plus suspect
        }

        // Pattern détection
        if (this.silences.length > 0) {
            const recentSilences = this.silences.slice(-5);
            const avgRecentDuration = recentSilences.reduce((sum, s) => 
                sum + s.duration, 0) / recentSilences.length;
            
            if (silence.duration > avgRecentDuration * 2) {
                confidence += 0.15; // Silence anormalement long
            }
        }

        confidence = Math.max(0, Math.min(1, confidence));

        return {
            isNatural: confidence < 0.6,
            confidence: confidence,
            reason: this.getClassificationReason(confidence, features),
            features: features
        };
    }

    /**
     * Génère une explication pour la classification
     */
    getClassificationReason(confidence, features) {
        if (confidence >= 0.8) {
            return 'Blanc très probablement non-naturel (durée excessive et/ou pattern inhabituel)';
        } else if (confidence >= 0.6) {
            return 'Blanc potentiellement non-naturel (durée anormale)';
        } else if (confidence >= 0.4) {
            return 'Blanc probablement naturel (pause standard)';
        } else {
            return 'Blanc naturel (pause normale dans la conversation)';
        }
    }

    /**
     * Déclenche une alerte pour un silence anormal
     */
    triggerAlert(silence, duration) {
        const alert = {
            type: 'unnaturalSilence',
            timestamp: new Date().toISOString(),
            duration: duration,
            startTime: silence.startTimestamp,
            avgDb: silence.avgDb,
            severity: duration > this.config.notificationThreshold * 2 ? 'high' : 'medium'
        };

        console.warn('🚨 ALERTE DÉCLENCHÉE:', {
            durée: (duration / 1000).toFixed(1) + 's',
            seuil: (this.config.notificationThreshold / 1000) + 's',
            sévérité: alert.severity
        });

        // Déclenche l'événement d'alerte
        window.dispatchEvent(new CustomEvent('silenceAlert', { 
            detail: alert 
        }));

        console.warn('⚠️ ALERTE: Blanc non-naturel détecté', alert);
    }

    /**
     * Obtient les statistiques des silences
     */
    getStatistics() {
        if (this.silences.length === 0) {
            return {
                total: 0,
                natural: 0,
                unnatural: 0,
                avgDuration: 0,
                totalSilenceDuration: 0
            };
        }

        const natural = this.silences.filter(s => s.type === 'natural').length;
        const unnatural = this.silences.filter(s => s.type === 'unnatural').length;
        const totalDuration = this.silences.reduce((sum, s) => sum + s.duration, 0);
        const avgDuration = totalDuration / this.silences.length;

        return {
            total: this.silences.length,
            natural: natural,
            unnatural: unnatural,
            avgDuration: Math.round(avgDuration),
            totalSilenceDuration: totalDuration,
            alertsSent: this.silences.filter(s => s.alertSent).length
        };
    }

    /**
     * Obtient tous les silences détectés
     */
    getSilences() {
        return this.silences;
    }

    /**
     * Obtient les silences non-naturels uniquement
     */
    getUnnaturalSilences() {
        return this.silences.filter(s => s.type === 'unnatural');
    }

    /**
     * Réinitialise les données
     */
    reset() {
        this.silences = [];
        this.currentSilence = null;
        this.lastSoundTime = Date.now();
    }

    /**
     * Sauvegarde la configuration
     */
    saveConfig() {
        localStorage.setItem('silenceDetectorConfig', JSON.stringify(this.config));
    }

    /**
     * Charge la configuration
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem('silenceDetectorConfig');
            if (stored) {
                const savedConfig = JSON.parse(stored);
                this.config = { ...this.config, ...savedConfig };
                console.log('📂 SilenceDetector: Configuration chargée depuis localStorage:', {
                    threshold: this.config.threshold + ' dB',
                    minSilenceDuration: this.config.minSilenceDuration + ' ms'
                });
            } else {
                console.log('🆕 SilenceDetector: Utilisation de la configuration par défaut');
            }
        } catch (error) {
            console.error('Erreur chargement config:', error);
        }
    }

    /**
     * Nettoie les ressources
     */
    cleanup() {
        this.stopMonitoring();
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SilenceDetector;
}

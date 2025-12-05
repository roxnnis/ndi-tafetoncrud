/**
 * EmailService Model
 * Gère l'envoi d'emails pour les alertes
 */

class EmailService {
    constructor() {
        this.config = {
            enabled: true,
            recipients: [],
            smtpServer: '',
            apiEndpoint: '', // Pour API externe (SendGrid, Mailgun, etc.)
            apiKey: '',
            fromEmail: 'alerts@ndi-audio.com',
            fromName: 'NDI Audio System'
        };

        this.emailQueue = [];
        this.loadConfig();
    }

    /**
     * Configure le service email
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }

    /**
     * Ajoute un destinataire
     */
    addRecipient(email, name = '') {
        if (!this.isValidEmail(email)) {
            return { success: false, message: 'Email invalide' };
        }

        if (!this.config.recipients.find(r => r.email === email)) {
            this.config.recipients.push({ email, name });
            this.saveConfig();
            return { success: true, message: 'Destinataire ajouté' };
        }

        return { success: false, message: 'Destinataire déjà présent' };
    }

    /**
     * Supprime un destinataire
     */
    removeRecipient(email) {
        const index = this.config.recipients.findIndex(r => r.email === email);
        if (index !== -1) {
            this.config.recipients.splice(index, 1);
            this.saveConfig();
            return { success: true, message: 'Destinataire supprimé' };
        }
        return { success: false, message: 'Destinataire introuvable' };
    }

    /**
     * Valide un email
     */
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Envoie une alerte de blanc non-naturel
     */
    async sendSilenceAlert(silenceData) {
        console.log('📧 EmailService: Envoi d\'alerte de silence demandé');
        
        if (!this.config.enabled) {
            console.warn('⚠️ Service email désactivé');
            return { success: false, message: 'Service email désactivé' };
        }

        if (this.config.recipients.length === 0) {
            console.warn('⚠️ Aucun destinataire configuré');
            return { success: false, message: 'Aucun destinataire configuré' };
        }

        const subject = `⚠️ Alerte: Blanc non-naturel détecté`;
        const body = this.buildSilenceAlertBody(silenceData);
        
        console.log('✉️ Préparation email d\'alerte pour', this.config.recipients.length, 'destinataire(s)');

        return await this.sendEmail(subject, body, 'alert');
    }

    /**
     * Construit le corps de l'email d'alerte
     */
    buildSilenceAlertBody(silenceData) {
        const duration = Math.round(silenceData.duration / 1000);
        const severity = silenceData.severity || 'medium';
        
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .alert.high { background: #f8d7da; border-color: #dc3545; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .label { font-weight: bold; color: #495057; }
        .value { color: #212529; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <h2>🚨 Alerte de Blanc Non-Naturel</h2>
        
        <div class="alert ${severity}">
            <strong>Un blanc anormalement long a été détecté dans l'enregistrement en cours.</strong>
        </div>

        <div class="details">
            <h3>Détails de l'alerte</h3>
            <div class="detail-row">
                <span class="label">Durée du blanc:</span>
                <span class="value">${duration} secondes</span>
            </div>
            <div class="detail-row">
                <span class="label">Heure de détection:</span>
                <span class="value">${new Date(silenceData.timestamp).toLocaleString('fr-FR')}</span>
            </div>
            <div class="detail-row">
                <span class="label">Niveau sonore moyen:</span>
                <span class="value">${silenceData.avgDb ? silenceData.avgDb.toFixed(1) : 'N/A'} dB</span>
            </div>
            <div class="detail-row">
                <span class="label">Sévérité:</span>
                <span class="value">${severity === 'high' ? '🔴 Élevée' : '🟡 Moyenne'}</span>
            </div>
        </div>

        <p><strong>Actions recommandées:</strong></p>
        <ul>
            <li>Vérifier l'état de l'émission/réunion en cours</li>
            <li>Contrôler les équipements audio</li>
            <li>Vérifier la connexion des intervenants</li>
        </ul>

        <div class="footer">
            <p>Cet email a été envoyé automatiquement par le système NDI Audio Recording.</p>
            <p>Pour modifier vos préférences de notification, accédez aux paramètres du module.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Envoie un rapport quotidien
     */
    async sendDailyReport(reportData) {
        if (!this.config.enabled) {
            return { success: false, message: 'Service email désactivé' };
        }

        const subject = `📊 Rapport quotidien - ${new Date().toLocaleDateString('fr-FR')}`;
        const body = this.buildDailyReportBody(reportData);

        return await this.sendEmail(subject, body, 'report');
    }

    /**
     * Construit le rapport quotidien
     */
    buildDailyReportBody(reportData) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 5px; text-align: center; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; color: #007bff; }
        .stat-label { color: #6c757d; margin-top: 5px; }
        .section { margin: 30px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .table th { background: #f8f9fa; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Rapport Quotidien</h1>
            <p>${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${reportData.totalRecordings || 0}</div>
                <div class="stat-label">Enregistrements</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.formatDuration(reportData.totalDuration || 0)}</div>
                <div class="stat-label">Durée totale</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reportData.silenceAlerts || 0}</div>
                <div class="stat-label">Alertes blancs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reportData.transcriptions || 0}</div>
                <div class="stat-label">Transcriptions</div>
            </div>
        </div>

        <div class="section">
            <h2>📝 Enregistrements du jour</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Heure</th>
                        <th>Nom</th>
                        <th>Durée</th>
                        <th>Taille</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.buildRecordingsTable(reportData.recordings || [])}
                </tbody>
            </table>
        </div>

        ${reportData.silences && reportData.silences.length > 0 ? `
        <div class="section">
            <h2>⚠️ Alertes de blancs non-naturels</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Heure</th>
                        <th>Durée</th>
                        <th>Sévérité</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.buildSilencesTable(reportData.silences)}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="footer">
            <p>Rapport généré automatiquement par NDI Audio Recording System</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Construit le tableau des enregistrements
     */
    buildRecordingsTable(recordings) {
        if (recordings.length === 0) {
            return '<tr><td colspan="4" style="text-align: center;">Aucun enregistrement</td></tr>';
        }

        return recordings.map(r => `
            <tr>
                <td>${new Date(r.timestamp).toLocaleTimeString('fr-FR')}</td>
                <td>${r.name}</td>
                <td>${this.formatDuration(r.duration)}</td>
                <td>${this.formatSize(r.size)}</td>
            </tr>
        `).join('');
    }

    /**
     * Construit le tableau des silences
     */
    buildSilencesTable(silences) {
        return silences.map(s => `
            <tr>
                <td>${new Date(s.timestamp).toLocaleTimeString('fr-FR')}</td>
                <td>${Math.round(s.duration / 1000)}s</td>
                <td>${s.severity === 'high' ? '🔴 Élevée' : '🟡 Moyenne'}</td>
            </tr>
        `).join('');
    }

    /**
     * Formate la durée
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

    /**
     * Formate la taille
     */
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Envoie un email (simulation - nécessite backend)
     */
    async sendEmail(subject, body, type = 'general') {
        const email = {
            id: Date.now(),
            to: this.config.recipients.map(r => r.email),
            subject: subject,
            body: body,
            type: type,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // En production, ceci nécessiterait un backend avec:
        // - Nodemailer (Node.js)
        // - API SendGrid, Mailgun, ou AWS SES
        // - Serveur SMTP

        // Simulation: ajoute à la file d'attente
        this.emailQueue.push(email);
        
        console.log('📧 Email ajouté à la file d\'attente:', {
            to: email.to,
            subject: email.subject
        });

        // Déclenche un événement
        window.dispatchEvent(new CustomEvent('emailQueued', {
            detail: email
        }));

        // Simulation d'envoi réussi
        setTimeout(() => {
            email.status = 'sent';
            window.dispatchEvent(new CustomEvent('emailSent', {
                detail: email
            }));
        }, 1000);

        return {
            success: true,
            message: 'Email ajouté à la file d\'attente',
            emailId: email.id,
            note: 'En production, configurez un backend pour l\'envoi réel d\'emails'
        };
    }

    /**
     * Teste la configuration email
     */
    async testConfiguration() {
        const testSubject = 'Test de configuration - NDI Audio System';
        const testBody = `
            <h2>Test de configuration email</h2>
            <p>Si vous recevez cet email, votre configuration est correcte.</p>
            <p>Date du test: ${new Date().toLocaleString('fr-FR')}</p>
        `;

        return await this.sendEmail(testSubject, testBody, 'test');
    }

    /**
     * Obtient la file d'attente des emails
     */
    getEmailQueue() {
        return this.emailQueue;
    }

    /**
     * Vide la file d'attente
     */
    clearQueue() {
        this.emailQueue = [];
        return { success: true, message: 'File d\'attente vidée' };
    }

    /**
     * Sauvegarde la configuration
     */
    saveConfig() {
        // Ne sauvegarde pas l'API key pour des raisons de sécurité
        const safeConfig = { ...this.config };
        delete safeConfig.apiKey;
        localStorage.setItem('emailServiceConfig', JSON.stringify(safeConfig));
    }

    /**
     * Charge la configuration
     */
    loadConfig() {
        try {
            const stored = localStorage.getItem('emailServiceConfig');
            if (stored) {
                this.config = { ...this.config, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Erreur chargement config email:', error);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailService;
}

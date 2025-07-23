
export const translations = {
  en: {
    title: "Backup Manager",
    createBackup: {
      title: "Create Backup",
      description: "Create an encrypted backup of your current data",
      button: "Create & Download Backup",
      creating: "Creating Backup...",
      note: "The backup will be encrypted with the password set in your encryption settings"
    },
    restoreBackup: {
      title: "Decrypt Backup",
      description: "Upload and decrypt a backup file to view its contents",
      fileLabel: "Backup File",
      filePlaceholder: "No file selected",
      browseButton: "Browse",
      passwordLabel: "Decryption Password",
      passwordPlaceholder: "Enter password to decrypt",
      decryptButton: "Decrypt Backup",
      decrypting: "Decrypting...",
      importButton: "Import Data",
      importNote: "This will overwrite your current data. Make sure to back up first."
    },
    decryptedContent: {
      title: "Decrypted Backup Content",
      description: "Showing decrypted data from backup file",
      note: "Note: Sensitive data such as passwords are not included in backups"
    },
    errors: {
      noPassword: "No encryption password set in settings",
      backupFailed: "Failed to create backup: ",
      decryptFailed: "Failed to decrypt backup. Check that you have the correct password.",
      noFile: "No backup file selected"
    }
  },
  fr: {
    title: "Gestionnaire de Sauvegarde",
    createBackup: {
      title: "Créer une Sauvegarde",
      description: "Créer une sauvegarde cryptée de vos données actuelles",
      button: "Créer & Télécharger la Sauvegarde",
      creating: "Création de la Sauvegarde...",
      note: "La sauvegarde sera cryptée avec le mot de passe défini dans vos paramètres de cryptage"
    },
    restoreBackup: {
      title: "Décrypter la Sauvegarde",
      description: "Télécharger et décrypter un fichier de sauvegarde pour voir son contenu",
      fileLabel: "Fichier de Sauvegarde",
      filePlaceholder: "Aucun fichier sélectionné",
      browseButton: "Parcourir",
      passwordLabel: "Mot de Passe de Décryptage",
      passwordPlaceholder: "Entrez le mot de passe pour décrypter",
      decryptButton: "Décrypter la Sauvegarde",
      decrypting: "Décryptage...",
      importButton: "Importer les Données",
      importNote: "Ceci écrasera vos données actuelles. Assurez-vous de faire une sauvegarde d'abord."
    },
    decryptedContent: {
      title: "Contenu de Sauvegarde Décrypté",
      description: "Affichage des données décryptées du fichier de sauvegarde",
      note: "Remarque: Les données sensibles telles que les mots de passe ne sont pas incluses dans les sauvegardes"
    },
    errors: {
      noPassword: "Aucun mot de passe de cryptage défini dans les paramètres",
      backupFailed: "Échec de la création de la sauvegarde: ",
      decryptFailed: "Échec du décryptage de la sauvegarde. Vérifiez que vous avez le bon mot de passe.",
      noFile: "Aucun fichier de sauvegarde sélectionné"
    }
  }
};

/**
 * Folder Validation Logic
 * Decoupled from FolderService for better maintainability and Single Responsibility.
 */

class FolderValidator {
    /**
     * Validate folder data before creation or update
     * @param {Object} folder - Folder data object
     * @throws {Error} If validation fails
     * @returns {boolean} True if valid
     */
    static validate(folder) {
        const errors = [];

        // Required fields checks
        if (!folder.fileCode) errors.push('Dosya kodu (fileCode) zorunludur.');
        if (!folder.subject) errors.push('Konu (subject) zorunludur.');
        if (!folder.category) errors.push('Kategori (category) zorunludur.');
        if (!folder.departmentId) errors.push('Birim ID (departmentId) zorunludur.');

        // Numeric checks
        if (!folder.fileYear) errors.push('Dosya yılı (fileYear) zorunludur.');
        if (isNaN(folder.fileYear)) errors.push('Dosya yılı sayısal olmalıdır.');

        if (folder.fileCount === undefined || folder.fileCount === null) errors.push('Dosya sayısı (fileCount) zorunludur.');
        if (isNaN(folder.fileCount)) errors.push('Dosya sayısı sayısal olmalıdır.');

        // Metadata checks
        if (!folder.folderType) errors.push('Klasör tipi (folderType) zorunludur.');
        if (!folder.retentionPeriod && folder.retentionPeriod !== 0) errors.push('Saklama süresi (retentionPeriod) zorunludur.');
        if (!folder.retentionCode) errors.push('Saklama kodu (retentionCode) zorunludur.');

        // Location structure check
        // Location can be flattened fields or nested object depending on DTO stage
        // We handle the case where it might be passed as separate fields or object
        const hasLocationObject = folder.location && folder.location.storageType;
        const hasLocationFields = folder.locationStorageType;

        if (!hasLocationObject && !hasLocationFields) {
            errors.push('Lokasyon bilgisi (location) zorunludur.');
        }

        if (errors.length > 0) {
            throw new Error(`Validasyon Hatası: ${errors.join(', ')}`);
        }

        return true;
    }
}

module.exports = FolderValidator;


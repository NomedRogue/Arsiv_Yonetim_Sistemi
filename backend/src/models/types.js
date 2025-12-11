/**
 * Shared Type Definitions (JSDoc)
 * This file mirrors the frontend/src/types.ts interfaces.
 * It provides IntelliSense support for the JavaScript backend.
 */

/**
 * @typedef {('Tıbbi'|'İdari')} Category
 */

/**
 * @typedef {('Dar'|'Geniş')} FolderType
 */

/**
 * @typedef {('Kompakt'|'Stand')} StorageType
 */

/**
 * @typedef {('Arşivde'|'Çıkışta'|'İmha Edildi')} FolderStatus
 */

/**
 * @typedef {Object} Location
 * @property {StorageType} storageType
 * @property {number} [unit]
 * @property {string} [face]
 * @property {number} [section]
 * @property {number} [shelf]
 * @property {number} [stand]
 */

/**
 * @typedef {Object} Folder
 * @property {string} id
 * @property {Category} category
 * @property {number} departmentId
 * @property {string} [departmentName]
 * @property {string} [clinic]
 * @property {string} [unitCode]
 * @property {string} fileCode
 * @property {string} subject
 * @property {string} [specialInfo]
 * @property {number} retentionPeriod
 * @property {string} retentionCode
 * @property {number} fileYear
 * @property {number} fileCount
 * @property {FolderType} folderType
 * @property {string} [pdfPath]
 * @property {string} [excelPath]
 * @property {Location} location
 * @property {FolderStatus} status
 * @property {Date|string} createdAt
 * @property {Date|string} updatedAt
 */

/**
 * @typedef {Object} Checkout
 * @property {string} id
 * @property {string} folderId
 * @property {('Tam'|'Kismi')} checkoutType
 * @property {string} [documentDescription]
 * @property {string} personName
 * @property {string} personSurname
 * @property {string} [personPhone]
 * @property {string} [reason]
 * @property {Date|string} checkoutDate
 * @property {Date|string} plannedReturnDate
 * @property {Date|string} [actualReturnDate]
 * @property {('Çıkışta'|'İade Edildi')} status
 */

/**
 * @typedef {Object} Disposal
 * @property {string} id
 * @property {string} folderId
 * @property {string} disposalDate
 * @property {string} [reason]
 * @property {Folder} originalFolderData
 */

/**
 * @typedef {Object} Log
 * @property {string} id
 * @property {Date|string} timestamp
 * @property {string} type
 * @property {number} [folderId]
 * @property {string} details
 */

module.exports = {};

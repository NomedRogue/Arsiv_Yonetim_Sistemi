/**
 * Folder Repository
 * Handles all database operations for folders
 */

const BaseRepository = require('./BaseRepository');
const logger = require('../../utils/logger');

class FolderRepository extends BaseRepository {
  constructor() {
    super('folders');
  }

  /**
   * Serialize folder data for database
   * Flattens location object into separate columns
   */
  serialize(folder) {
    const serialized = {
      id: folder.id,
      category: folder.category,
      departmentId: folder.departmentId,
      clinic: folder.clinic || null,
      unitCode: folder.unitCode || null,
      fileCode: folder.fileCode,
      subject: folder.subject,
      specialInfo: folder.specialInfo || null,
      retentionPeriod: folder.retentionPeriod,
      retentionCode: folder.retentionCode,
      fileYear: folder.fileYear,
      fileCount: folder.fileCount,
      folderType: folder.folderType,
      pdfPath: folder.pdfPath || null,
      excelPath: folder.excelPath || null,
      locationStorageType: folder.location?.storageType || null,
      locationUnit: folder.location?.unit || null,
      locationFace: folder.location?.face || null,
      locationSection: folder.location?.section || null,
      locationShelf: folder.location?.shelf || null,
      locationStand: folder.location?.stand || null,
      status: folder.status,
      createdAt: folder.createdAt instanceof Date ? folder.createdAt.toISOString() : folder.createdAt,
      updatedAt: folder.updatedAt instanceof Date ? folder.updatedAt.toISOString() : folder.updatedAt
    };

    return serialized;
  }

  /**
   * Deserialize folder data from database
   * Reconstructs location object from separate columns
   */
  deserialize(row) {
    return {
      id: row.id,
      category: row.category,
      departmentId: row.departmentId,
      clinic: row.clinic,
      unitCode: row.unitCode,
      fileCode: row.fileCode,
      subject: row.subject,
      specialInfo: row.specialInfo,
      retentionPeriod: row.retentionPeriod,
      retentionCode: row.retentionCode,
      fileYear: row.fileYear,
      fileCount: row.fileCount,
      folderType: row.folderType,
      pdfPath: row.pdfPath,
      excelPath: row.excelPath,
      location: {
        storageType: row.locationStorageType,
        unit: row.locationUnit,
        face: row.locationFace,
        section: row.locationSection,
        shelf: row.locationShelf,
        stand: row.locationStand
      },
      status: row.status,
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
    };
  }

  /**
   * Find folders with advanced filtering and pagination
   */
  findWithFilters(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        order = 'desc',
        general,
        category,
        departmentId,
        clinic,
        fileCode,
        subject,
        specialInfo,
        startYear,
        endYear,
        retentionCode,
        status
      } = options;

      const db = this.getDb();
      let whereClauses = [];
      let params = [];

      // İmha edilmiş klasörleri varsayılan olarak hariç tut (status filter gelmediyse)
      if (!status || status === 'Tümü') {
        // "Tümü" seçildiğinde imha edilmişler hariç tümünü göster
        whereClauses.push('status != ?');
        params.push('İmha Edildi');
      }

      // General search (searches across multiple fields)
      // General search (searches across multiple fields) using FTS5
      if (general && general.trim()) {
        const searchTerm = general.trim();
        // FTS syntax: wrap in quotes for phrase, append * for prefix matching
        // Simple sanitization: remove quotes to prevent syntax errors
        const sanitizedTerm = searchTerm.replace(/"/g, '');
        const ftsQuery = `"${sanitizedTerm}"*`;
        
        whereClauses.push(`id IN (SELECT id FROM folders_fts WHERE folders_fts MATCH ?)`);
        params.push(ftsQuery);
      }

      // Specific filters
      if (category && category !== 'Tümü') {
        whereClauses.push('category = ?');
        params.push(category);
      }

      if (departmentId) {
        whereClauses.push('departmentId = ?');
        params.push(departmentId);
      }

      if (clinic) {
        whereClauses.push('clinic LIKE ?');
        params.push(`%${clinic}%`);
      }

      if (fileCode) {
        whereClauses.push('fileCode LIKE ?');
        params.push(`%${fileCode}%`);
      }

      if (subject) {
        whereClauses.push('subject LIKE ?');
        params.push(`%${subject}%`);
      }

      if (specialInfo) {
        whereClauses.push('specialInfo LIKE ?');
        params.push(`%${specialInfo}%`);
      }

      if (startYear) {
        // Sadece startYear verilmişse, o yıla eşit klasörleri getir
        // Eğer endYear da verilmişse aralık araması yap
        if (endYear) {
          whereClauses.push('fileYear >= ?');
          params.push(Number(startYear));
        } else {
          // Tek yıl araması - yıla eşit klasörleri getir
          whereClauses.push('fileYear = ?');
          params.push(Number(startYear));
        }
      }

      if (endYear) {
        whereClauses.push('fileYear <= ?');
        params.push(Number(endYear));
      }

      if (retentionCode) {
        whereClauses.push('retentionCode = ?');
        params.push(retentionCode);
      }

      if (status) {
        whereClauses.push('status = ?');
        params.push(status);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      
      // Count total matching records
      const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
      const countResult = db.prepare(countQuery).get(...params);
      const total = countResult.count;

      // Get paginated results with explicit columns
      const offset = (page - 1) * limit;
      const orderClause = `ORDER BY ${sortBy} ${order.toUpperCase()}`;
      const columns = `id, category, departmentId, clinic, unitCode, fileCode, subject, specialInfo, 
                       retentionPeriod, retentionCode, fileYear, fileCount, folderType, pdfPath, excelPath,
                       locationStorageType, locationUnit, locationFace, locationSection, locationShelf, locationStand,
                       status, createdAt, updatedAt`;
      const query = `SELECT ${columns} FROM ${this.tableName} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
      
      const rows = db.prepare(query).all(...params, limit, offset);
      const items = rows.map(row => this.deserialize(row));

      return {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('[FOLDER_REPO] findWithFilters error:', { error, options });
      throw error;
    }
  }

  /**
   * Get all folders for analysis (lightweight, no pagination)
   * İmha edilmiş klasörler hariç
   */
  getAllForAnalysis() {
    try {
      const db = this.getDb();
      const query = `
        SELECT id, category, departmentId, clinic, fileYear, fileCount, 
               folderType, locationStorageType, locationUnit, locationFace, 
               locationSection, locationShelf, locationStand, status, retentionPeriod, retentionCode
        FROM ${this.tableName}
        WHERE status != 'İmha Edildi'
      `;
      
      const rows = db.prepare(query).all();
      return rows.map(row => ({
        id: row.id,
        category: row.category,
        departmentId: row.departmentId,
        clinic: row.clinic,
        fileYear: row.fileYear,
        fileCount: row.fileCount,
        folderType: row.folderType,
        location: {
          storageType: row.locationStorageType,
          unit: row.locationUnit,
          face: row.locationFace,
          section: row.locationSection,
          shelf: row.locationShelf,
          stand: row.locationStand
        },
        status: row.status,
        retentionPeriod: row.retentionPeriod,
        retentionCode: row.retentionCode
      }));
    } catch (error) {
      logger.error('[FOLDER_REPO] getAllForAnalysis error:', { error });
      throw error;
    }
  }

  /**
   * Find folders by location
   */
  findByLocation(location) {
    try {
      const db = this.getDb();
      // İmha edilmiş klasörleri hariç tut
      let whereClauses = ['locationStorageType = ?', 'status != ?'];
      let params = [location.storageType, 'İmha Edildi'];

      if (location.storageType === 'Kompakt') {
        if (location.unit) {
          whereClauses.push('locationUnit = ?');
          params.push(location.unit);
        }
        if (location.face) {
          whereClauses.push('locationFace = ?');
          params.push(location.face);
        }
        if (location.section) {
          whereClauses.push('locationSection = ?');
          params.push(location.section);
        }
        if (location.shelf) {
          whereClauses.push('locationShelf = ?');
          params.push(location.shelf);
        }
      } else if (location.storageType === 'Stand') {
        if (location.stand) {
          whereClauses.push('locationStand = ?');
          params.push(location.stand);
        }
        if (location.shelf) {
          whereClauses.push('locationShelf = ?');
          params.push(location.shelf);
        }
      }

      const whereClause = whereClauses.join(' AND ');
      const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
      
      const rows = db.prepare(query).all(...params);
      return rows.map(row => this.deserialize(row));
    } catch (error) {
      logger.error('[FOLDER_REPO] findByLocation error:', { error, location });
      throw error;
    }
  }

  /**
   * Delete folder and return affected data
   */
  deleteById(id) {
    try {
      const folder = this.getById(id);
      if (!folder) {
        return null;
      }

      const db = this.getDb();
      db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
      
      return folder;
    } catch (error) {
      logger.error('[FOLDER_REPO] deleteById error:', { error, id });
      throw error;
    }
  }

  /**
   * Insert with automatic timestamp
   */
  insert(data) {
    const now = new Date().toISOString();
    const dataWithTimestamp = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };
    return super.insert(dataWithTimestamp);
  }

  /**
   * Update with automatic timestamp
   */
  update(id, data) {
    const dataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    return super.update(id, dataWithTimestamp);
  }
}

module.exports = FolderRepository;

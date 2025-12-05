/**
 * Base Repository
 * Generic CRUD operations for all repositories
 * Implements Repository Pattern for data access abstraction
 */

const { getDbInstance } = require('../connection');
const logger = require('../../utils/logger');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = getDbInstance();
  }

  /**
   * Get database instance
   */
  getDb() {
    if (!this.db || !this.db.open) {
      this.db = getDbInstance();
    }
    return this.db;
  }

  /**
   * Get all records from table
   */
  getAll() {
    try {
      const db = this.getDb();
      const rows = db.prepare(`SELECT * FROM ${this.tableName}`).all();
      return rows.map(row => this.deserialize(row));
    } catch (error) {
      logger.error(`[${this.tableName.toUpperCase()}] getAll error:`, { error });
      throw error;
    }
  }

  /**
   * Get record by ID
   */
  getById(id) {
    try {
      const db = this.getDb();
      const row = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
      return row ? this.deserialize(row) : null;
    } catch (error) {
      logger.error(`[${this.tableName.toUpperCase()}] getById error:`, { error, id });
      throw error;
    }
  }

  /**
   * Insert new record
   */
  insert(data) {
    try {
      const db = this.getDb();
      const serialized = this.serialize(data);
      const columns = Object.keys(serialized).join(', ');
      const placeholders = Object.keys(serialized).map(() => '?').join(', ');
      const values = Object.values(serialized);

      const stmt = db.prepare(`INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`);
      const result = stmt.run(...values);
      
      return this.getById(data.id || result.lastInsertRowid);
    } catch (error) {
      logger.error(`[${this.tableName.toUpperCase()}] insert error:`, { error, data });
      throw error;
    }
  }

  /**
   * Update existing record
   */
  update(id, data) {
    try {
      const db = this.getDb();
      const serialized = this.serialize(data);
      const setClause = Object.keys(serialized).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(serialized), id];

      const stmt = db.prepare(`UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`);
      stmt.run(...values);
      
      return this.getById(id);
    } catch (error) {
      logger.error(`[${this.tableName.toUpperCase()}] update error:`, { error, id, data });
      throw error;
    }
  }

  /**
   * Delete record by ID
   */
  delete(id) {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      logger.error(`[${this.tableName.toUpperCase()}] delete error:`, { error, id });
      throw error;
    }
  }

  /**
   * Count total records
   */
  count(whereClause = '', params = []) {
    try {
      const db = this.getDb();
      const query = `SELECT COUNT(*) as count FROM ${this.tableName}${whereClause ? ' WHERE ' + whereClause : ''}`;
      const result = db.prepare(query).get(...params);
      return result.count;
    } catch (error) {
      logger.error(`[${this.tableName.toUpperCase()}] count error:`, { error });
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  transaction(callback) {
    const db = this.getDb();
    const transaction = db.transaction(callback);
    return transaction();
  }

  /**
   * Serialize data for database (can be overridden)
   * Default: convert dates to ISO strings
   */
  serialize(data) {
    const serialized = { ...data };
    
    // Convert Date objects to ISO strings
    for (const key in serialized) {
      if (serialized[key] instanceof Date) {
        serialized[key] = serialized[key].toISOString();
      }
    }
    
    return serialized;
  }

  /**
   * Deserialize data from database (can be overridden)
   * Default: convert ISO strings to Date objects for known date fields
   */
  deserialize(row) {
    const deserialized = { ...row };
    
    // Convert ISO strings to Date objects for common date fields
    const dateFields = ['createdAt', 'updatedAt', 'timestamp', 'checkoutDate', 'returnDate', 'disposalDate'];
    for (const field of dateFields) {
      if (deserialized[field] && typeof deserialized[field] === 'string') {
        deserialized[field] = new Date(deserialized[field]);
      }
    }
    
    return deserialized;
  }
}

module.exports = BaseRepository;

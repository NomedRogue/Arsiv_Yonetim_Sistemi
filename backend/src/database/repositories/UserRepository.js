/**
 * User Repository
 * Handles all database operations for users
 */

const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcryptjs');
const logger = require('../../utils/logger');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find user by username
   */
  findByUsername(username) {
    try {
      if (!username) return null;
      
      const db = this.getDb();
      const row = db.prepare(`SELECT * FROM ${this.tableName} WHERE username = ?`).get(username);
      
      if (!row) return null;
      
      return this.deserialize(row);
    } catch (error) {
      logger.error('[USER_REPO] findByUsername error:', { error, username });
      throw error;
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(user, password) {
    if (!user ||!user.password) return false;
    return await bcrypt.compare(password, user.password);
  }

  /**
   * Create new user with hashed password
   */
  async create(userData) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const newUser = {
        ...userData,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return this.insert(newUser);
    } catch (error) {
      logger.error('[USER_REPO] create user error:', { error });
      throw error;
    }
  }

  /**
   * Update password
   */
  async updatePassword(id, newPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const user = this.getById(id);
      if (!user) throw new Error('User not found');
      
      const updatedUser = {
        ...user,
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      };
      
      return this.update(id, updatedUser);
    } catch (error) {
      logger.error('[USER_REPO] updatePassword error:', { error, id });
      throw error;
    }
  }

  serialize(user) {
    return {
      id: user.id,
      username: user.username,
      password: user.password, // Hashed
      role: user.role || 'user',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  deserialize(row) {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

module.exports = UserRepository;

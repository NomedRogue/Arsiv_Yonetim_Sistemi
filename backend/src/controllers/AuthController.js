const jwt = require('jsonwebtoken');
const { getRepositories } = require('../database/repositories');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AuthController {
  constructor() {
    this.userRepo = getRepositories().user;
  }

  // Ensure repo is ready (helper)
  getRepo() {
    if (!this.userRepo) {
      this.userRepo = getRepositories().user;
    }
    return this.userRepo;
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
      }

      const repo = this.getRepo();
      const user = repo.findByUsername(username);

      if (!user) {
        // Security: Don't reveal if user exists
        logger.warn('[AUTH] Login failed: User not found', { username });
        return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
      }

      const isValid = await repo.verifyPassword(user, password);

      if (!isValid) {
        logger.warn('[AUTH] Login failed: Wrong password', { username });
        return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
      }

      // Generate Token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      logger.info('[AUTH] Login successful', { username });

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      logger.error('[AUTH] Login error', { error });
      res.status(500).json({ error: 'Giriş işlemi sırasında hata oluştu.' });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
      }

      const repo = this.getRepo();
      const user = repo.getById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      }

      const isValid = await repo.verifyPassword(user, currentPassword);
      if (!isValid) {
        return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
      }

      await repo.updatePassword(userId, newPassword);
      logger.info('[AUTH] Password changed', { username: user.username });

      res.json({ message: 'Şifre başarıyla değiştirildi.' });
    } catch (error) {
      logger.error('[AUTH] Change password error', { error });
      res.status(500).json({ error: 'Şifre değiştirilemedi.' });
    }
  }

  // Create initial admin if no users exist
  async ensureAdminUser() {
    try {
      const repo = this.getRepo();
      const db = repo.getDb();
      
      // Check count directly to avoid full scan if possible
      const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

      if (count === 0) {
        logger.info('[AUTH] No users found. Creating default admin user.');
        
        await repo.create({
          id: uuidv4(),
          username: 'admin',
          password: 'admin123', // Will be hashed by repo
          role: 'admin'
        });
        
        logger.info('[AUTH] Default admin created: admin / admin123');
      }
    } catch (error) {
      logger.error('[AUTH] Ensure admin error', { error });
    }
  }
  // User Management Methods
  
  async getUsers(req, res) {
    try {
      const repo = this.getRepo();
      const users = repo.getAll();
      // Remove sensitive data
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));
      res.json(safeUsers);
    } catch (error) {
      logger.error('[AUTH] Get users error', { error });
      res.status(500).json({ error: 'Kullanıcılar getirilemedi.' });
    }
  }

  async createUser(req, res) {
    try {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
      }

      const repo = this.getRepo();
      const existing = repo.findByUsername(username);
      if (existing) {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanımda.' });
      }

      const newUser = await repo.create({
        id: uuidv4(),
        username,
        password,
        role: role || 'user'
      });

      logger.info('[AUTH] User created', { username: newUser.username, createdBy: req.user.username });

      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      });
    } catch (error) {
      logger.error('[AUTH] Create user error', { error });
      res.status(500).json({ error: 'Kullanıcı oluşturulamadı.' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' });
      }

      const repo = this.getRepo();
      const user = repo.getById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      }
      
      // Prevent deleting last admin? (Implementation skipped for simplicity, but good practice)

      repo.delete(id);
      logger.info('[AUTH] User deleted', { deletedUser: user.username, deletedBy: req.user.username });
      
      res.json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (error) {
      logger.error('[AUTH] Delete user error', { error });
      res.status(500).json({ error: 'Kullanıcı silinemedi.' });
    }
  }

  async adminUpdatePassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
      }

      const repo = this.getRepo();
      const user = repo.getById(id);

      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      }

      await repo.updatePassword(id, newPassword);
      logger.info('[AUTH] Password reset by admin', { targetUser: user.username, admin: req.user.username });

      res.json({ message: 'Şifre başarıyla güncellendi.' });
    } catch (error) {
      logger.error('[AUTH] Admin update password error', { error });
      res.status(500).json({ error: 'Şifre güncellenemedi.' });
    }
  }
}

module.exports = new AuthController();

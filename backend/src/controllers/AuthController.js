const { AuthService } = require('../services/AuthService');
const logger = require('../utils/logger');
const { getRepositories } = require('../database/repositories');

// Initialize Service
const authService = new AuthService();

class AuthController {
  
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      res.json(result);
    } catch (error) {
      // Handle known service errors
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      logger.error('[AUTH_CONTROLLER] Login error', { error });
      res.status(500).json({ error: 'Giriş işlemi sırasında hata oluştu.' });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id; // From middleware

      // Validate new password briefly here or inside service
      // Service handles implementation
      await authService.changePassword(userId, currentPassword, newPassword);
      
      res.json({ message: 'Şifre başarıyla değiştirildi.' });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      logger.error('[AUTH_CONTROLLER] Change password error', { error });
      res.status(500).json({ error: 'Şifre değiştirilemedi.' });
    }
  }

  async createUser(req, res) {
    try {
      const { username, password, role } = req.body;
      const creatorUsername = req.user ? req.user.username : 'system';

      const newUser = await authService.createUser(username, password, role, creatorUsername);
      res.status(201).json(newUser);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      logger.error('[AUTH_CONTROLLER] Create user error', { error });
      res.status(500).json({ error: 'Kullanıcı oluşturulamadı.' });
    }
  }

  // Public registration
  async register(req, res) {
    try {
      const { username, email, password } = req.body;
      // Note: Email is currently not stored in User model based on repos.user.create, but we can treat username as email or just ignore email for now 
      // providing backwards compatibility if checking `username` vs `email`.
      // The frontend sends "username", "email", "password". 
      // We will use "username" as the unique identifier. "email" might be unused or we can store it if schema allows.
      // Based on AuthService, it only takes username, password, role.
      // We will force role='user'.
      
      const newUser = await authService.createUser(username, password, 'user', 'public_registration');
      res.status(201).json(newUser);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      logger.error('[AUTH_CONTROLLER] Register error', { error });
      res.status(500).json({ error: 'Kayıt işlemi başarısız.' });
    }
  }

  // Admin Methods - Keeping some logic here or moving to service as needed.
  // For simplicity and Direct DB access reduction, moving get/delete to repo-wrapper pattern inside controller IF service method is missing,
  // BUT we should ideally move them to service.
  // Since AuthService.test.js coverage was partial (only login/change), I will keep simple Repo access here for untested methods
  // OR add them to service now. Let's stick to using Repos directly for simple CRUD to avoid breaking changes if service is incomplete,
  // BUT for consistency, I will use repos via getRepositories() as before for Get/Delete/AdminUpdate

  async getUsers(req, res) {
    try {
      const repos = getRepositories(); 
      const users = repos.user.getAll();
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));
      res.json(safeUsers);
    } catch (error) {
      logger.error('[AUTH_CONTROLLER] Get users error', { error });
      res.status(500).json({ error: 'Kullanıcılar getirilemedi.' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const repos = getRepositories();
      
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' });
      }

      const user = repos.user.getById(id);
      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      }
      
      repos.user.delete(id);
      logger.info('[AUTH_CONTROLLER] User deleted', { deletedUser: user.username, deletedBy: req.user.username });
      
      res.json({ message: 'Kullanıcı başarıyla silindi.' });
    } catch (error) {
       logger.error('[AUTH_CONTROLLER] Delete user error', { error });
       res.status(500).json({ error: 'Kullanıcı silinemedi.' });
    }
  }

  async adminUpdatePassword(req, res) {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const adminUsername = req.user.username;

        await authService.adminUpdatePassword(id, newPassword, adminUsername);
        res.json({ message: 'Şifre başarıyla güncellendi.' });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        logger.error('[AUTH_CONTROLLER] Admin password update error', { error });
        res.status(500).json({ error: 'Şifre güncellenemedi.' });
    }
  }

  // Initialization helper
  async ensureAdminUser() {
      // Kept as-is or moved to service? 
      // It's a startup routine, can stay here or move to service.
      // Logic is minimal.
      try {
        const repos = getRepositories();
        const db = repos.user.getDb();
        const count = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

        if (count === 0) {
            logger.info('[AUTH] Creating default admin user via Service');
            await authService.createUser('admin', 'admin123', 'admin', 'system');
            logger.warn('----------------------------------------------------');
            logger.warn('[SECURITY WARNING] Default admin account created!');
            logger.warn('Username: admin / Password: admin123');
            logger.warn('----------------------------------------------------');
        }
      } catch (error) {
          logger.error('[AUTH] Ensure admin error', { error });
      }
  }
}

module.exports = new AuthController();

/**
 * Auth Service
 * Business logic for Authentication and User Management
 */
const jwt = require('jsonwebtoken');
const { getRepositories } = require('../database/repositories');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// JWT Secret handling
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-this-in-production-minimum-32-chars';

class AuthService {
    constructor() {
        this.repos = getRepositories();
    }

    /**
     * Authenticate user
     */
    async login(username, password) {
        if (!username || !password) {
            throw { status: 400, message: 'Kullanıcı adı ve şifre gereklidir.' };
        }

        const user = this.repos.user.findByUsername(username);

        if (!user) {
            logger.warn('[AUTH_SERVICE] Login failed: User not found', { username });
            throw { status: 401, message: 'Kullanıcı adı veya şifre hatalı.' };
        }

        const isValid = await this.repos.user.verifyPassword(user, password);
        if (!isValid) {
            logger.warn('[AUTH_SERVICE] Login failed: Wrong password', { username });
            throw { status: 401, message: 'Kullanıcı adı veya şifre hatalı.' };
        }

        if (!user.isApproved) {
            logger.warn('[AUTH_SERVICE] Login failed: Account not approved', { username });
            throw { status: 403, message: 'Hesabınız onay bekliyor. Lütfen yönetici ile iletişime geçin.' };
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        logger.info('[AUTH_SERVICE] Login successful', { username });

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };
    }

    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        if (!newPassword || newPassword.length < 6) {
            throw { status: 400, message: 'Yeni şifre en az 6 karakter olmalıdır.' };
        }

        const user = this.repos.user.getById(userId);
        if (!user) {
            throw { status: 404, message: 'Kullanıcı bulunamadı.' };
        }

        const isValid = await this.repos.user.verifyPassword(user, currentPassword);
        if (!isValid) {
            throw { status: 401, message: 'Mevcut şifre hatalı.' };
        }

        await this.repos.user.updatePassword(userId, newPassword);
        logger.info('[AUTH_SERVICE] Password changed', { username: user.username });
        
        return { success: true };
    }

    /**
     * Create new user (Admin only logic handles mainly data creation)
     */
    async createUser(username, password, role, creatorUsername) {
        if (!username || !password) {
            throw { status: 400, message: 'Kullanıcı adı ve şifre gereklidir.' };
        }

        const existing = this.repos.user.findByUsername(username);
        if (existing) {
            throw { status: 400, message: 'Bu kullanıcı adı zaten kullanımda.' };
        }

        // Approval Logic
        // 1. If it is the first user, auto-approve (Admin)
        // 2. If created by an existing admin (creatorUsername != 'public_registration'), auto-approve
        // 3. Otherwise (public registration), set to pending (false)
        
        let isApproved = false;
        
        // Simple check for first user
        // Note: getAll() for count is okay for low user volume. For high volume, use count() helper if available or direct DB.
        const allUsers = this.repos.user.getAll();
        if (allUsers.length === 0) {
            isApproved = true;
            role = 'admin'; // Force admin for first user
        } else if (creatorUsername && creatorUsername !== 'public_registration') {
            isApproved = true;
        }

        const newUser = await this.repos.user.create({
            id: uuidv4(),
            username,
            password,
            role: role || 'user',
            isApproved: isApproved ? 1 : 0
        });

        logger.info('[AUTH_SERVICE] User created', { username, createdBy: creatorUsername });

        return {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            isApproved: newUser.isApproved === 1,
            createdAt: newUser.createdAt
        };
    }

    /**
     * Approve user (Admin only)
     */
    async approveUser(targetUserId, adminUsername) {
        const user = this.repos.user.getById(targetUserId);
        if (!user) {
            throw { status: 404, message: 'Kullanıcı bulunamadı.' };
        }

        await this.repos.user.updateStatus(targetUserId, true);
        logger.info('[AUTH_SERVICE] User approved', { targetUser: user.username, admin: adminUsername });

        return { success: true };
    }

    /**
     * Admin Force Password Update
     */
    async adminUpdatePassword(userId, newPassword, adminUsername) {
        if (!newPassword || newPassword.length < 6) {
            throw { status: 400, message: 'Yeni şifre en az 6 karakter olmalıdır.' };
        }

        const user = this.repos.user.getById(userId);
        if (!user) {
            throw { status: 404, message: 'Kullanıcı bulunamadı.' };
        }

        await this.repos.user.updatePassword(userId, newPassword);
        logger.info('[AUTH_SERVICE] Password reset by admin', { targetUser: user.username, admin: adminUsername });

        return { success: true };
    }
}

module.exports = { AuthService };

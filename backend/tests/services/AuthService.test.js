/* eslint-disable no-undef */

jest.mock('../../src/database/repositories');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token')
}));

const { getRepositories } = require('../../src/database/repositories');
const { AuthService } = require('../../src/services/AuthService');
const jwt = require('jsonwebtoken');

describe('AuthService Unit Tests', () => {
    let service;
    
    // Spies
    let findByUsername;
    let verifyPassword;
    let getById;
    let updatePassword;
    let create;

    beforeEach(() => {
        jest.clearAllMocks();
        
        findByUsername = jest.fn();
        verifyPassword = jest.fn();
        getById = jest.fn();
        updatePassword = jest.fn();
        create = jest.fn();

        const mockRepo = {
            user: {
                findByUsername,
                verifyPassword,
                getById,
                updatePassword,
                create
            }
        };

        getRepositories.mockReturnValue(mockRepo);
        service = new AuthService();
    });

    describe('login', () => {
        it('should throw error if username or password missing', async () => {
            await expect(service.login('', 'pass')).rejects.toEqual(
                expect.objectContaining({ status: 400 })
            );
        });

        it('should throw error if user not found', async () => {
            findByUsername.mockReturnValue(null);
            await expect(service.login('ghost', 'pass')).rejects.toEqual(
                expect.objectContaining({ status: 401 })
            );
        });

        it('should throw error if password verification fails', async () => {
            findByUsername.mockReturnValue({ id: '1', username: 'test' });
            verifyPassword.mockReturnValue(Promise.resolve(false));

            await expect(service.login('test', 'wrongpass')).rejects.toEqual(
                expect.objectContaining({ status: 401 })
            );
        });

        it('should return token and user info on success', async () => {
            const user = { id: '1', username: 'admin', role: 'admin', isApproved: 1 };
            findByUsername.mockReturnValue(user);
            verifyPassword.mockReturnValue(Promise.resolve(true));

            const result = await service.login('admin', '123456');

            expect(result).toHaveProperty('token', 'mock-token');
            expect(result.user).toEqual({
                id: '1',
                username: 'admin',
                role: 'admin'
            });
            expect(jwt.sign).toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        it('should throw error if new password is too short', async () => {
             await expect(service.changePassword('1', 'old', 'short'))
                 .rejects.toEqual(expect.objectContaining({ message: expect.stringContaining('en az 6') }));
        });

        it('should update password if validation passes', async () => {
             const user = { id: '1', username: 'user' };
             getById.mockReturnValue(user);
             verifyPassword.mockReturnValue(Promise.resolve(true));

             const result = await service.changePassword('1', 'oldpass', 'newpass123');
             
             expect(result).toEqual({ success: true });
             expect(updatePassword).toHaveBeenCalledWith('1', 'newpass123');
        });
    });
});

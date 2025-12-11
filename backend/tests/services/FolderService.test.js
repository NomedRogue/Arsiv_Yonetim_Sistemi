/* eslint-disable no-undef */

// Setup mocks
jest.mock('../../src/database/repositories');
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

const { getRepositories } = require('../../src/database/repositories');
const { FolderService } = require('../../src/services/FolderService');

describe('FolderService Unit Tests', () => {
    let service;
    let mockInsert;
    let mockUpdate;
    let mockAddLog;

    beforeEach(() => {
        jest.clearAllMocks();

        mockInsert = jest.fn();
        mockUpdate = jest.fn();
        mockAddLog = jest.fn();

        const mockRepo = {
            folder: {
                insert: mockInsert,
                update: mockUpdate,
                getById: jest.fn(),
                delete: jest.fn()
            },
            log: {
                addLog: mockAddLog
            },
            checkout: {
                getByFolderId: jest.fn(),
                delete: jest.fn()
            },
            disposal: {
                getByFolderId: jest.fn(),
                delete: jest.fn()
            }
        };

        // Configure getRepositories to return our mock object
        getRepositories.mockReturnValue(mockRepo);

        service = new FolderService();
    });

    describe('createFolder', () => {
        it('should throw validation error if data is invalid', async () => {
            const invalidData = { subject: 'No Code' };
            await expect(service.createFolder(invalidData)).rejects.toThrow(/Validasyon Hatası/);
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('should insert folder and log action when data is valid', async () => {
            const validData = {
                fileCode: 'TEST-001',
                subject: 'Unit Test',
                category: 'İdari',
                departmentId: 1,
                fileYear: 2024,
                fileCount: 1,
                folderType: 'Dar',
                retentionPeriod: 5,
                retentionCode: 'R1',
                location: { storageType: 'Stand', shelf: 1 }
            };

            const dbResponse = { ...validData, id: 'db-id-1', status: 'Arşivde' };
            mockInsert.mockReturnValue(dbResponse);

            const result = await service.createFolder(validData);

            expect(result).toEqual(dbResponse);
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                fileCode: 'TEST-001',
                status: 'Arşivde',
                id: expect.any(String)
            }));
            expect(mockAddLog).toHaveBeenCalled();
        });
    });
});

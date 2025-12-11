/* eslint-disable no-undef */

jest.mock('../../src/database/repositories');
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

const { getRepositories } = require('../../src/database/repositories');
const { CheckoutService } = require('../../src/services/CheckoutService');

describe('CheckoutService Unit Tests', () => {
    let service;

    // Spies
    let folderGetById;
    let folderUpdate;
    let checkoutInsert;
    let checkoutGetById;
    let checkoutUpdate;
    let logAdd;

    beforeEach(() => {
        jest.clearAllMocks();

        // Define spies
        folderGetById = jest.fn();
        folderUpdate = jest.fn();
        checkoutInsert = jest.fn();
        checkoutGetById = jest.fn();
        checkoutUpdate = jest.fn();
        logAdd = jest.fn();

        // Setup mock repo
        const mockRepo = {
            folder: { getById: folderGetById, update: folderUpdate },
            checkout: { insert: checkoutInsert, getById: checkoutGetById, update: checkoutUpdate },
            log: { addLog: logAdd }
        };

        getRepositories.mockReturnValue(mockRepo);
        service = new CheckoutService();
    });

    describe('createCheckout', () => {
        it('should throw error if folder does not exist', async () => {
            folderGetById.mockReturnValue(null);
            await expect(service.createCheckout({ folderId: '999' }))
                .rejects.toThrow('Klasör bulunamadı');
        });

        it('should throw error if folder is already checked out', async () => {
            folderGetById.mockReturnValue({ id: '1', status: 'Çıkışta' });
            await expect(service.createCheckout({ folderId: '1' }))
                .rejects.toThrow('Bu klasör zaten çıkışta');
        });

        it('should create checkout and update folder status', async () => {
            // Setup
            const folder = { id: '1', status: 'Arşivde', fileCode: 'F1', subject: 'Sub' };
            folderGetById.mockReturnValue(folder);

            const checkoutData = {
                folderId: '1',
                personName: 'John',
                personSurname: 'Doe'
            };

            const createdCheckout = { ...checkoutData, id: 'chk-1', status: 'Çıkışta' };
            checkoutInsert.mockReturnValue(createdCheckout);

            // Execute
            const result = await service.createCheckout(checkoutData);

            // Verify
            expect(result).toEqual(createdCheckout);

            // Check folder update to 'Çıkışta'
            expect(folderUpdate).toHaveBeenCalledWith('1', expect.objectContaining({
                status: 'Çıkışta',
                updatedAt: expect.any(Date)
            }));

            // Check log added
            expect(logAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'checkout'
            }));
        });
    });

    describe('returnCheckout', () => {
        it('should throw error if checkout not found', async () => {
            checkoutGetById.mockReturnValue(null);
            await expect(service.returnCheckout('chk-999'))
                .rejects.toThrow('Çıkış kaydı bulunamadı');
        });

        it('should throw error if already returned', async () => {
            checkoutGetById.mockReturnValue({ id: 'chk-1', status: 'İade Edildi' });
            await expect(service.returnCheckout('chk-1'))
                .rejects.toThrow('Bu klasör zaten iade edildi');
        });

        it('should return checkout correctly and update folder status', async () => {
            // Setup
            const checkout = { id: 'chk-1', folderId: 'f-1', status: 'Çıkışta' };
            const folder = { id: 'f-1', status: 'Çıkışta', fileCode: 'FILE', subject: 'SUB' };

            checkoutGetById.mockReturnValue(checkout);
            folderGetById.mockReturnValue(folder);
            checkoutUpdate.mockReturnValue({ ...checkout, status: 'İade Edildi' });

            // Execute
            await service.returnCheckout('chk-1');

            // Verify Checkout Update
            expect(checkoutUpdate).toHaveBeenCalledWith('chk-1', expect.objectContaining({
                status: 'İade Edildi',
                actualReturnDate: expect.any(Date)
            }));

            // Verify Folder Update to 'Arşivde'
            expect(folderUpdate).toHaveBeenCalledWith('f-1', expect.objectContaining({
                status: 'Arşivde',
                updatedAt: expect.any(Date)
            }));

            // Verify Log
            expect(logAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'return'
            }));
        });
    });
});

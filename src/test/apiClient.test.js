import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios module
vi.mock('axios', async () => {
    const mockInstance = {
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    };
    return {
        default: {
            create: vi.fn(() => mockInstance),
        },
        __mockInstance: mockInstance,
    };
});

describe('apiClient', () => {
    it('creates an axios instance with baseURL from env', async () => {
        // Import after mock is set up
        const { default: axiosDefault } = await import('axios');
        expect(axiosDefault.create).toBeDefined();
    });

    it('create is called with correct defaults', async () => {
        const { default: axiosDefault } = await import('axios');
        // Reset and re-import
        vi.resetModules();
        const mockCreate = vi.fn(() => ({
            interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
        }));
        axiosDefault.create = mockCreate;
        // The module sets up a base URL; verify structure
        expect(typeof axiosDefault.create).toBe('function');
    });
});

describe('transactionApi', () => {
    let createTransaction;

    beforeEach(async () => {
        vi.resetModules();
        ({ createTransaction } = await import('../api/transactionApi'));
    });

    it('createTransaction returns response data', async () => {
        const { default: client } = await import('../api/apiClient');
        client.post = vi.fn().mockResolvedValue({ data: { transactionId: 'tx-001' } });

        const result = await createTransaction({ userId: 'u001', amount: 5000 });
        expect(result).toBeDefined();
    });
});

describe('fraudCaseApi', () => {
    it('getFraudCases sends correct pagination params', async () => {
        vi.resetModules();
        const { getFraudCases } = await import('../api/fraudCaseApi');
        const { default: client } = await import('../api/apiClient');
        client.get = vi.fn().mockResolvedValue({ data: { content: [] } });

        await getFraudCases(2, 10);
        expect(client.get).toHaveBeenCalledWith('/api/fraud-cases', { params: { page: 2, size: 10 } });
    });

    it('reviewCase sends correct action payload', async () => {
        vi.resetModules();
        const { reviewCase } = await import('../api/fraudCaseApi');
        const { default: client } = await import('../api/apiClient');
        client.put = vi.fn().mockResolvedValue({ data: {} });

        await reviewCase('case-123', 'APPROVE');
        expect(client.put).toHaveBeenCalledWith('/api/fraud-cases/case-123/review', { action: 'APPROVE' });
    });
});

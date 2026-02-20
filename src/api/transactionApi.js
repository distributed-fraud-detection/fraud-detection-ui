import apiClient from './apiClient';

/**
 * POST /api/transactions
 * { userId, amount, location, merchantType }
 */
export const createTransaction = (payload) =>
    apiClient.post('/api/transactions', payload).then((r) => r.data);

/**
 * GET /api/transactions/{id}
 */
export const getTransaction = (id) =>
    apiClient.get(`/api/transactions/${id}`).then((r) => r.data);

/**
 * GET /api/transactions/user/{userId}?page=0&size=20
 */
export const getTransactionsByUser = (userId, page = 0, size = 20) =>
    apiClient
        .get(`/api/transactions/user/${userId}`, { params: { page, size } })
        .then((r) => r.data);

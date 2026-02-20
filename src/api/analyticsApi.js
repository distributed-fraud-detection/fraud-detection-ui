import apiClient from './apiClient';

/**
 * GET /api/analytics/daily-summary?days=14
 */
export const getDailySummary = (days = 14) =>
    apiClient
        .get('/api/analytics/daily-summary', { params: { days } })
        .then((r) => r.data);

/**
 * GET /api/analytics/top-risk-users?limit=10
 */
export const getTopRiskUsers = (limit = 10) =>
    apiClient
        .get('/api/analytics/top-risk-users', { params: { limit } })
        .then((r) => r.data);

/**
 * POST /api/analytics/run-batch
 */
export const triggerBatch = () =>
    apiClient.post('/api/analytics/run-batch').then((r) => r.data);

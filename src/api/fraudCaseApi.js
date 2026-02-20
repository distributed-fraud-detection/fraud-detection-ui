import apiClient from './apiClient';

/**
 * GET /api/fraud-cases?page=0&size=20
 * Returns { content, totalElements, ... }
 */
export const getFraudCases = (page = 0, size = 20) =>
    apiClient
        .get('/api/fraud-cases', { params: { page, size } })
        .then((r) => r.data);

/**
 * GET /api/fraud-cases/{caseId}
 */
export const getFraudCase = (caseId) =>
    apiClient.get(`/api/fraud-cases/${caseId}`).then((r) => r.data);

/**
 * PUT /api/fraud-cases/{caseId}/review
 * body: { action: 'APPROVE' | 'REJECT' }
 */
export const reviewCase = (caseId, action) =>
    apiClient
        .put(`/api/fraud-cases/${caseId}/review`, { action })
        .then((r) => r.data);

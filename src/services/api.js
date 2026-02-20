/**
 * API Service Layer — connects the React frontend to the Spring Boot backend.
 *
 * All calls go through the API Gateway at port 8080.
 * In development: VITE_API_BASE_URL=http://localhost:8080
 * In Docker:      VITE_API_BASE_URL=http://api-gateway:8080
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const request = async (method, path, body) => {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`API error ${res.status}: ${err}`);
    }
    // 204 No Content
    if (res.status === 204) return null;
    return res.json();
};

// ── Transaction Service ──────────────────────────────────────────────────────

export const transactionApi = {
    /**
     * POST /api/transactions
     * Creates a new transaction and triggers the full fraud detection pipeline.
     * @param {Object} payload - { userId, amount, location, merchantType }
     * @returns {Promise<TransactionDTO>}
     */
    create: (payload) => request('POST', '/api/transactions', payload),

    /**
     * GET /api/transactions/{id}
     */
    getById: (id) => request('GET', `/api/transactions/${id}`),

    /**
     * GET /api/transactions/user/{userId}
     */
    getByUser: (userId) => request('GET', `/api/transactions/user/${userId}`),
};

// ── Fraud Decision Service ───────────────────────────────────────────────────

export const fraudCaseApi = {
    /**
     * GET /api/fraud-cases?page=0&size=20
     * Returns a paginated list of fraud cases.
     * @returns {Promise<Page<FraudCaseDTO>>}
     */
    getAll: (page = 0, size = 20) =>
        request('GET', `/api/fraud-cases?page=${page}&size=${size}`),

    /**
     * GET /api/fraud-cases/{caseId}
     */
    getById: (caseId) => request('GET', `/api/fraud-cases/${caseId}`),

    /**
     * PUT /api/fraud-cases/{caseId}/review
     * Analyst approves or rejects a PENDING fraud case.
     * @param {string} caseId
     * @param {'APPROVE'|'REJECT'} action
     * @returns {Promise<FraudCaseDTO>}
     */
    review: (caseId, action) =>
        request('PUT', `/api/fraud-cases/${caseId}/review`, { action }),
};

// ── Analytics Service ────────────────────────────────────────────────────────

export const analyticsApi = {
    /**
     * GET /api/analytics/daily-summary
     * Returns last 14 days of aggregated fraud metrics.
     * @returns {Promise<AggregatedMetric[]>}
     */
    getDailySummary: () => request('GET', '/api/analytics/daily-summary'),

    /**
     * GET /api/analytics/top-risk-users
     * Returns top 10 users by risk score.
     * @returns {Promise<RiskProfileDTO[]>}
     */
    getTopRiskUsers: () => request('GET', '/api/analytics/top-risk-users'),

    /**
     * POST /api/analytics/run-batch
     * Manually triggers the Spring Batch nightly analytics job.
     * @returns {Promise<{ jobId: string, status: string }>}
     */
    runBatch: () => request('POST', '/api/analytics/run-batch'),
};

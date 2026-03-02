import express from 'express';
import cors from 'cors';
import {
    mockTransactions,
    mockFraudCases,
    dailyAnalytics,
    topRiskyUsers,
    kpiData,
    generateLiveTransaction
} from './src/data/mockData.js';

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// Add artificial delay to simulate network latency
app.use((req, res, next) => {
    setTimeout(next, 500);
});

// 1. Dashboard Metrics
app.get('/api/metrics/dashboard', (req, res) => {
    res.json({
        activeCases: mockFraudCases.filter(c => c.status === 'PENDING').length,
        highRiskUsers: topRiskyUsers.length,
        systemHealth: 99.9,
        activeRules: 42,
        ...kpiData
    });
});

// 2. Paginated Transactions
app.get('/api/transactions', (req, res) => {
    const page = parseInt(req.query.page || '0');
    const size = parseInt(req.query.size || '10');
    const start = page * size;
    const end = start + size;
    res.json({
        content: mockTransactions.slice(start, end),
        totalElements: mockTransactions.length,
        totalPages: Math.ceil(mockTransactions.length / size),
        number: page,
        size: size
    });
});

// 3. Paginated Pending Cases
app.get('/api/fraud-cases', (req, res) => {
    const page = parseInt(req.query.page || '0');
    const size = parseInt(req.query.size || '10');
    const start = page * size;
    const end = start + size;
    const pendingCases = mockFraudCases.filter(c => c.status === 'PENDING');

    res.json({
        content: pendingCases.slice(start, end),
        totalElements: pendingCases.length,
        totalPages: Math.ceil(pendingCases.length / size),
        number: page,
        size: size
    });
});

// 4. Case Review Action
app.put('/api/fraud-cases/:id/review', (req, res) => {
    const decision = req.body.action;
    const caseId = req.params.id;

    if (!decision) {
        return res.status(400).json({ message: "Action parameter is missing!" });
    }

    const targetCase = mockFraudCases.find(c => c.caseId === caseId);
    if (!targetCase) {
        return res.status(404).json({ message: "Case not found." });
    }

    targetCase.status = decision === 'APPROVE' ? 'APPROVED' :
        decision === 'BLOCK' ? 'BLOCKED' : 'INVESTIGATING';

    res.json(targetCase);
});

// 5. Analytics: Daily Summary
app.get('/api/analytics/daily-summary', (req, res) => {
    res.json(dailyAnalytics); // React expects array directly
});

// 6. Analytics: Top Risky Users
app.get('/api/analytics/top-risk-users', (req, res) => {
    res.json(topRiskyUsers); // React expects array directly
});

// 7. Analytics: Batch Trigger
app.post('/api/analytics/run-batch', (req, res) => {
    res.json({ status: 'BATCH_TRIGGERED', message: 'DailyFraudAnalyticsJob launched successfully via MOCK' });
});

// 8. Simulate Transaction (Kafka Trigger)
app.post('/api/simulate/transaction', (req, res) => {
    const newTx = generateLiveTransaction();
    mockTransactions.unshift(newTx); // Add to top of list

    if (newTx.decision === 'BLOCK' || newTx.decision === 'REVIEW') {
        mockFraudCases.unshift({
            caseId: `FC${Date.now().toString().slice(-4)}`,
            transactionId: newTx.transactionId,
            userId: newTx.userId,
            amount: newTx.amount,
            riskScore: newTx.riskScore,
            decision: newTx.decision,
            status: 'PENDING',
            flagReason: 'Mock simulator triggered rule detection.'
        });
    }

    res.json(newTx);
});

app.listen(PORT, () => {
    console.log(`✅ Lightweight Mock API Gateway running at http://localhost:${PORT}`);
    console.log(`\n=============================================================`);
    console.log(`🚀 SERVER IS ACTIVE AND LISTENING!`);
    console.log(`⚠️  Do NOT close this terminal. It will stay open intentionally.`);
    console.log(`=============================================================\n`);
});

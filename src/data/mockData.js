// Mock data store for the Fraud Detection Platform
import { subDays, format, subHours, subMinutes } from 'date-fns';

const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Lagos', 'Dubai', 'Singapore', 'New York', 'London'];
const userIds = ['u001', 'u002', 'u003', 'u004', 'u005', 'u006', 'u007', 'u008', 'u009', 'u010'];
const userNames = ['Arjun Sharma', 'Priya Kapoor', 'Rahul Mehta', 'Sneha Iyer', 'Vikram Nair', 'Anita Desai', 'Rohan Gupta', 'Divya Reddy', 'Siddharth Joshi', 'Kavita Patel'];
const merchantTypes = ['E-Commerce', 'ATM Withdrawal', 'POS Purchase', 'Wire Transfer', 'P2P Payment', 'Crypto Exchange', 'International Transfer'];

const getRiskScore = (amount, location, hour) => {
    let score = 0;
    if (amount > 50000) score += 0.3;
    else if (amount > 20000) score += 0.15;
    if (['Lagos', 'Dubai', 'Singapore'].includes(location)) score += 0.2;
    if (hour >= 0 && hour <= 5) score += 0.2;
    score += Math.random() * 0.4;
    return Math.min(0.99, Math.max(0.01, score));
};

const getDecision = (score) => {
    if (score > 0.8) return 'BLOCK';
    if (score > 0.6) return 'REVIEW';
    return 'APPROVE';
};

// Generate mock transactions
const generateTransactions = (count = 120) => {
    const txns = [];
    for (let i = 0; i < count; i++) {
        const userIdx = Math.floor(Math.random() * userIds.length);
        const locationIdx = Math.floor(Math.random() * locations.length);
        const amount = Math.round((Math.random() * 95000 + 1000) * 100) / 100;
        const hoursAgo = Math.floor(Math.random() * 72);
        const ts = subHours(new Date(), hoursAgo + Math.random());
        const hour = ts.getHours();
        const riskScore = getRiskScore(amount, locations[locationIdx], hour);
        const decision = getDecision(riskScore);
        txns.push({
            transactionId: `tx${String(1000 + i).padStart(4, '0')}`,
            userId: userIds[userIdx],
            userName: userNames[userIdx],
            amount,
            location: locations[locationIdx],
            merchantType: merchantTypes[Math.floor(Math.random() * merchantTypes.length)],
            timestamp: ts.toISOString(),
            riskScore: Math.round(riskScore * 100) / 100,
            decision,
            status: decision === 'REVIEW' ? (Math.random() > 0.5 ? 'PENDING' : (Math.random() > 0.5 ? 'APPROVED' : 'REJECTED')) : decision === 'BLOCK' ? 'BLOCKED' : 'APPROVED',
        });
    }
    return txns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Generate fraud cases from blocked/review transactions
const generateFraudCases = (transactions) => {
    return transactions
        .filter(t => t.decision === 'BLOCK' || t.decision === 'REVIEW')
        .map((t, i) => ({
            caseId: `FC${String(2000 + i).padStart(4, '0')}`,
            transactionId: t.transactionId,
            userId: t.userId,
            userName: t.userName,
            amount: t.amount,
            location: t.location,
            riskScore: t.riskScore,
            decision: t.decision,
            status: t.status,
            timestamp: t.timestamp,
            flagReason: t.riskScore > 0.85
                ? 'High-value transaction in high-risk geography'
                : t.riskScore > 0.75
                    ? 'Unusual transaction pattern detected'
                    : 'Velocity check: multiple transactions in short window',
        }));
};

// Daily analytics data (last 14 days)
const generateDailyAnalytics = () => {
    const data = [];
    for (let i = 13; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const totalTxns = Math.floor(Math.random() * 500 + 800);
        const fraudulent = Math.floor(Math.random() * 60 + 20);
        const reviewed = Math.floor(Math.random() * 80 + 30);
        const blocked = Math.floor(Math.random() * 40 + 10);
        data.push({
            date: format(date, 'MMM dd'),
            fullDate: date.toISOString(),
            totalTransactions: totalTxns,
            fraudulent,
            reviewed,
            blocked,
            approved: totalTxns - fraudulent - reviewed,
            fraudRate: Math.round((fraudulent / totalTxns) * 1000) / 10,
            avgRiskScore: Math.round((Math.random() * 0.3 + 0.3) * 100) / 100,
        });
    }
    return data;
};

// Top risky users
const generateTopRiskyUsers = () => {
    return userIds.map((uid, i) => ({
        userId: uid,
        userName: userNames[i],
        totalTransactions: Math.floor(Math.random() * 50 + 10),
        fraudCount: Math.floor(Math.random() * 15 + 2),
        avgRiskScore: Math.round((Math.random() * 0.4 + 0.5) * 100) / 100,
        totalAmount: Math.round(Math.random() * 500000 + 50000),
        lastSeen: subMinutes(new Date(), Math.floor(Math.random() * 1440)).toISOString(),
    })).sort((a, b) => b.avgRiskScore - a.avgRiskScore);
};

// Risk distribution for pie chart
const getRiskDistribution = (transactions) => {
    const block = transactions.filter(t => t.decision === 'BLOCK').length;
    const review = transactions.filter(t => t.decision === 'REVIEW').length;
    const approve = transactions.filter(t => t.decision === 'APPROVE').length;
    return [
        { name: 'Approved', value: approve, color: '#10b981' },
        { name: 'Review', value: review, color: '#f59e0b' },
        { name: 'Blocked', value: block, color: '#ef4444' },
    ];
};

// Initialize data
export const mockTransactions = generateTransactions(120);
export const mockFraudCases = generateFraudCases(mockTransactions);
export const dailyAnalytics = generateDailyAnalytics();
export const topRiskyUsers = generateTopRiskyUsers();
export const riskDistribution = getRiskDistribution(mockTransactions);

// KPIs
export const kpiData = {
    totalTransactions: mockTransactions.length,
    blockedCount: mockTransactions.filter(t => t.decision === 'BLOCK').length,
    reviewCount: mockTransactions.filter(t => t.decision === 'REVIEW').length,
    approvedCount: mockTransactions.filter(t => t.decision === 'APPROVE').length,
    fraudRate: Math.round((mockTransactions.filter(t => t.decision !== 'APPROVE').length / mockTransactions.length) * 1000) / 10,
    avgRiskScore: Math.round(mockTransactions.reduce((a, t) => a + t.riskScore, 0) / mockTransactions.length * 100) / 100,
    totalVolume: Math.round(mockTransactions.reduce((a, t) => a + t.amount, 0)),
    highRiskCount: mockTransactions.filter(t => t.riskScore > 0.8).length,
};

// Simulate new live transaction
export const generateLiveTransaction = () => {
    const userIdx = Math.floor(Math.random() * userIds.length);
    const locationIdx = Math.floor(Math.random() * locations.length);
    const amount = Math.round((Math.random() * 95000 + 1000) * 100) / 100;
    const riskScore = getRiskScore(amount, locations[locationIdx], new Date().getHours());
    return {
        transactionId: `tx${Date.now().toString().slice(-6)}`,
        userId: userIds[userIdx],
        userName: userNames[userIdx],
        amount,
        location: locations[locationIdx],
        merchantType: merchantTypes[Math.floor(Math.random() * merchantTypes.length)],
        timestamp: new Date().toISOString(),
        riskScore: Math.round(riskScore * 100) / 100,
        decision: getDecision(riskScore),
        status: 'PROCESSING',
    };
};

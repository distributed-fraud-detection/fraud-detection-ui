import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/transactionApi', () => ({ createTransaction: vi.fn() }));
vi.mock('../api/fraudCaseApi', () => ({ getFraudCases: vi.fn() }));

import Simulator from '../pages/Simulator';
import { createTransaction } from '../api/transactionApi';
import { getFraudCases } from '../api/fraudCaseApi';

const fastTimings = {
    heartbeatIntervalMs: 20,
    stepBaseDelayMs: 1,
    stepJitterDelayMs: 0,
    pollIntervalMs: 2,
    autoModeIntervalMs: 15,
};

const renderSimulator = (timings = fastTimings) =>
    render(
        <MemoryRouter>
            <Simulator timings={timings} />
        </MemoryRouter>
    );

describe('Simulator page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
        vi.spyOn(Math, 'random').mockReturnValue(0);

        createTransaction.mockResolvedValue({ transactionId: 'tx-default', timestamp: '2024-01-01T10:00:00.000Z' });
        getFraudCases.mockResolvedValue({ content: [] });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders labeled form fields and default idle state', () => {
        renderSimulator();

        expect(screen.getByLabelText(/User ID/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Merchant Type/i)).toBeInTheDocument();
        expect(screen.getByText(/Submit a transaction to see the real-time result/i)).toBeInTheDocument();
        expect(screen.getByText(/No transactions yet. Submit one above./i)).toBeInTheDocument();
    });

    it('does not submit when amount is invalid', () => {
        renderSimulator();
        fireEvent.click(screen.getByRole('button', { name: /Submit Transaction/i }));
        expect(createTransaction).not.toHaveBeenCalled();
    });

    it('submits payload and shows pending decision when no case is found', async () => {
        createTransaction.mockResolvedValue({ transactionId: 'tx-001', timestamp: '2024-01-01T10:00:00.000Z' });

        renderSimulator();
        fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '12000' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit Transaction/i }));

        await waitFor(() => {
            expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u001', amount: 12000 }));
        });

        await waitFor(() => {
            expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
            expect(screen.getByText(/Decision Result/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/1 records \(this session\)/i)).toBeInTheDocument();
    });

    it('shows BLOCK decision with risk details and reason when case is found', async () => {
        createTransaction.mockResolvedValue({ transactionId: 'tx-real-123', timestamp: '2024-01-01T10:00:00.000Z' });
        getFraudCases.mockResolvedValue({
            content: [{
                transactionId: 'tx-real-123',
                decision: 'BLOCK',
                riskScore: 0.92,
                flagReason: 'High-risk transaction',
                caseId: 'case-001',
            }],
        });

        renderSimulator();
        fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '90000' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit Transaction/i }));

        await waitFor(() => {
            expect(screen.getAllByText('BLOCK').length).toBeGreaterThan(0);
            expect(screen.getAllByText('0.92').length).toBeGreaterThan(0);
            expect(screen.getByText(/High-risk transaction/i)).toBeInTheDocument();
        });
    });

    it('shows API error message when transaction creation fails', async () => {
        createTransaction.mockRejectedValue({ backendMessage: 'Backend unavailable' });

        renderSimulator();
        fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '5000' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit Transaction/i }));

        await waitFor(() => {
            expect(screen.getByText(/Backend unavailable/i)).toBeInTheDocument();
        });
    });

    it('toggles auto mode and submits generated transactions', async () => {
        renderSimulator();

        fireEvent.click(screen.getByRole('button', { name: /^Auto$/i }));
        expect(screen.getByText(/Auto-generating transactions every 0.0s/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'u001',
                location: 'Mumbai',
                merchantType: 'E-Commerce',
                amount: 1000,
            }));
        });

        fireEvent.click(screen.getByRole('button', { name: /Stop/i }));
        expect(screen.queryByText(/Auto-generating transactions every 0.0s/i)).not.toBeInTheDocument();
    });

    it('updates backend status indicator when heartbeat succeeds', async () => {
        fetch.mockResolvedValue({ ok: true });
        renderSimulator({ ...fastTimings, heartbeatIntervalMs: 100 });

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/actuator/health'));
            expect(screen.getByText(/Backend Online/i)).toBeInTheDocument();
        });
    });
});

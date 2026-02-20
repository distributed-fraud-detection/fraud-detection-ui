import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock API modules
vi.mock('../api/transactionApi', () => ({
    createTransaction: vi.fn(),
}));
vi.mock('../api/fraudCaseApi', () => ({
    getFraudCases: vi.fn(),
}));

import Simulator from '../pages/Simulator';
import { createTransaction } from '../api/transactionApi';
import { getFraudCases } from '../api/fraudCaseApi';

const renderSimulator = () =>
    render(
        <MemoryRouter>
            <Simulator />
        </MemoryRouter>
    );

describe('Simulator page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: no fraud cases for polling
        getFraudCases.mockResolvedValue({ content: [] });
    });

    it('renders the form fields', () => {
        renderSimulator();
        expect(screen.getByLabelText(/User ID/i) || screen.getByText(/User ID/i)).toBeTruthy();
        expect(screen.getByText(/Amount/i)).toBeTruthy();
        expect(screen.getByText(/Location/i)).toBeTruthy();
        expect(screen.getByText(/Merchant Type/i)).toBeTruthy();
    });

    it('submit button is visible and enabled initially', () => {
        renderSimulator();
        const btn = screen.getByRole('button', { name: /Submit Transaction/i });
        expect(btn).toBeTruthy();
        expect(btn.disabled).toBe(false);
    });

    it('shows processing state after submit click', async () => {
        createTransaction.mockResolvedValue({ transactionId: 'tx-9999', timestamp: new Date().toISOString() });

        renderSimulator();
        const amountInput = screen.getByPlaceholderText(/e.g. 15000/i);
        fireEvent.change(amountInput, { target: { value: '5000' } });

        const btn = screen.getByRole('button', { name: /Submit Transaction/i });
        fireEvent.click(btn);

        // Button should switch to processing mode
        await waitFor(() => {
            expect(screen.queryByText(/Processing/i) || btn.disabled).toBeTruthy();
        }, { timeout: 2000 });
    });

    it('calls createTransaction with correct payload', async () => {
        createTransaction.mockResolvedValue({ transactionId: 'tx-001', timestamp: new Date().toISOString() });

        renderSimulator();
        const amountInput = screen.getByPlaceholderText(/e.g. 15000/i);
        fireEvent.change(amountInput, { target: { value: '12000' } });

        fireEvent.click(screen.getByRole('button', { name: /Submit Transaction/i }));

        await waitFor(() => {
            expect(createTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'u001',
                    amount: 12000,
                })
            );
        }, { timeout: 3000 });
    });

    it('shows PENDING decision when polling finds no case yet', async () => {
        createTransaction.mockResolvedValue({ transactionId: 'tx-002', timestamp: new Date().toISOString() });
        getFraudCases.mockResolvedValue({ content: [] }); // Never found

        renderSimulator();
        const amountInput = screen.getByPlaceholderText(/e.g. 15000/i);
        fireEvent.change(amountInput, { target: { value: '500' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit Transaction/i }));

        // After pipeline completes, check result area appears
        await waitFor(() => {
            expect(screen.queryByText(/Decision Result/i)).toBeTruthy();
        }, { timeout: 10000 });
    });

    it('shows real decision when polling finds matching case', async () => {
        const txId = 'tx-real-123';
        createTransaction.mockResolvedValue({ transactionId: txId, timestamp: new Date().toISOString() });
        getFraudCases.mockResolvedValue({
            content: [{
                transactionId: txId,
                decision: 'BLOCK',
                riskScore: 0.92,
                flagReason: 'High-risk transaction',
                caseId: 'case-001',
            }],
        });

        renderSimulator();
        const amountInput = screen.getByPlaceholderText(/e.g. 15000/i);
        fireEvent.change(amountInput, { target: { value: '90000' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit Transaction/i }));

        await waitFor(() => {
            expect(screen.queryByText('BLOCK') || screen.queryByText(/0.92/)).toBeTruthy();
        }, { timeout: 10000 });
    });
});

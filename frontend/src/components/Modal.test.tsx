import React, { useRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Modal } from './Modal';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  AlertTriangle: () => <span data-testid="icon-alert">Alert</span>,
  CheckCircle: () => <span data-testid="icon-check">Check</span>,
  Info: () => <span data-testid="icon-info">Info</span>,
}));

describe('Modal Component', () => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose,
    onConfirm,
    title: 'Test Modal',
    children: <div>Modal Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    // Find close button (X icon parent)
    const closeBtn = screen.getByLabelText('Kapat');
    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    const cancelBtn = screen.getByText('İptal');
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);

    const confirmBtn = screen.getByText('Onayla');
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<Modal {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has correct ARIA attributes', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');

    const title = screen.getByText('Test Modal');
    const content = screen.getByText('Modal Content').parentElement;

    expect(title.id).toBeTruthy();
    expect(content?.id).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(content?.id);
  });

  it('initial focus is set to the first focusable element', async () => {
    // We need to delay check because focus happens in useEffect
    render(<Modal {...defaultProps} />);

    await waitFor(() => {
        // The first focusable element in the modal is the Close button
        const closeBtn = screen.getByLabelText('Kapat');
        expect(document.activeElement).toBe(closeBtn);
    });
  });
});

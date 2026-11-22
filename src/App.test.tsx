import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('Motion Lab workflow', () => {
  it('computes results and explanations for the default launch', () => {
    window.location.hash = '/lab';
    render(<App />);
    expect(screen.getByTestId('range')).toHaveTextContent('40.8 m');
    expect(screen.getByText(/45° gives the longest range/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Trajectory: range 40.8 metres/ })).toBeInTheDocument();
  });

  it('switches planets, validates input and keeps the last valid result', async () => {
    window.location.hash = '/lab';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Moon' }));
    expect(screen.getByTestId('range')).toHaveTextContent('246.9 m');
    expect(screen.getByText(/on the Moon/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Angle'), { target: { value: '120' } });
    expect(screen.getByText('Angle must be between 0 and 90.')).toBeInTheDocument();
    expect(screen.getByText(/Showing the last valid launch/)).toBeInTheDocument();
    expect(screen.getByTestId('range')).toHaveTextContent('246.9 m');
  });

  it('scrubs time and manages pinned comparisons', async () => {
    window.location.hash = '/lab';
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '0' } });
    expect(screen.getByTestId('clock')).toHaveTextContent('t = 0.00 s · x = 0.0 m');
    await user.click(screen.getByRole('button', { name: 'Pin for comparison' }));
    expect(screen.getByRole('button', { name: 'Pin for comparison' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Remove 20 m\/s at 30°/ }));
    expect(screen.getByRole('button', { name: 'Pin for comparison' })).toBeEnabled();
  });
});

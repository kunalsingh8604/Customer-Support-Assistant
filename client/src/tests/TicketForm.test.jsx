import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketForm from '../components/TicketForm';

describe('TicketForm', () => {
  it('submits correctly with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const { container } = render(<TicketForm onSubmit={onSubmit} />);
    const form = container.querySelector('form');

    await user.selectOptions(within(form).getByLabelText('Customer type'), 'Enterprise');
    await user.selectOptions(within(form).getByLabelText('Product area'), 'billing');
    await user.type(
      within(form).getByLabelText('Issue description'),
      'Customer payment keeps failing at checkout with card decline.'
    );
    await user.click(within(form).getByRole('button', { name: 'Create ticket' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_type: 'Enterprise',
        product_area: 'billing',
        issue_description:
          'Customer payment keeps failing at checkout with card decline.',
      })
    );
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const { container } = render(<TicketForm onSubmit={onSubmit} />);
    const form = container.querySelector('form');
    await user.click(within(form).getByRole('button', { name: 'Create ticket' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Issue description is required.');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

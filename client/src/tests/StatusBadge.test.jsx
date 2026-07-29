import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/Badges';

describe('StatusBadge', () => {
  const cases = [
    { status: 'open', classPart: 'bg-sky-100', label: 'Open' },
    { status: 'in-review', classPart: 'bg-amber-100', label: 'In Review' },
    { status: 'resolved', classPart: 'bg-emerald-100', label: 'Resolved' },
    { status: 'closed', classPart: 'bg-slate-200', label: 'Closed' },
  ];

  it.each(cases)(
    'renders correct color for status "$status"',
    ({ status, classPart, label }) => {
      render(<StatusBadge status={status} />);
      const badge = screen.getByText(label);
      expect(badge.className).toContain(classPart);
    }
  );
});

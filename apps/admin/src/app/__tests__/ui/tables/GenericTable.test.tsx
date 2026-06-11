import { render, screen } from '@testing-library/react';

import { GenericTable } from '@/app/ui/tables/GenericTable';

type Row = { id: string; name: string; age: number };

const rows: Row[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 24 },
];

describe('GenericTable', () => {
  it('renders headers from columns', () => {
    render(
      <GenericTable<Row>
        data={rows}
        keyExtractor={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'age', header: 'Age' },
        ]}
      />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
  });

  it('stringifies cell values by default', () => {
    render(
      <GenericTable<Row>
        data={rows}
        keyExtractor={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'age', header: 'Age' },
        ]}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('uses the render override when provided', () => {
    render(
      <GenericTable<Row>
        data={rows}
        keyExtractor={(r) => r.id}
        columns={[
          {
            key: 'name',
            header: 'Person',
            render: (value, row) => `${String(value)} (${row.id})`,
          },
        ]}
      />
    );
    expect(screen.getByText('Alice (1)')).toBeInTheDocument();
    expect(screen.getByText('Bob (2)')).toBeInTheDocument();
  });

  it('renders nothing for empty data', () => {
    render(
      <GenericTable<Row>
        data={[]}
        keyExtractor={(r) => r.id}
        columns={[{ key: 'name', header: 'Name' }]}
      />
    );
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });
});

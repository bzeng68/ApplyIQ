'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type Props = {
  daily: Array<Record<string, number | string>>;
};

function formatDate(value: string) {
  return value.slice(5);
}

export default function TokenCharts({ daily }: Props) {
  if (!daily || daily.length === 0) {
    return (
      <div className="card p-6">
        <p className="text-muted">No token data yet. Token logging activates when evaluations run.</p>
      </div>
    );
  }

  const cumulative = daily.reduce<Array<Record<string, number | string>>>((acc, row) => {
    const last = acc[acc.length - 1];
    const prevCost = last ? Number(last.cumulative_cost || 0) : 0;
    const nextCost = prevCost + Number(row.estimated_cost_sonnet || 0);
    acc.push({ ...row, cumulative_cost: nextCost });
    return acc;
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-4">
        <h2 className="text-lg font-semibold">Daily input vs output</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E8E4DC" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="input_tokens" stackId="a" fill="#3D6B5B" />
              <Bar dataKey="output_tokens" stackId="a" fill="#A07C40" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="text-lg font-semibold">Cumulative cost</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulative} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E8E4DC" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cumulative_cost" stroke="#4A7C59" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card p-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Tokens per offer</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E8E4DC" strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="tokens_per_offer" stroke="#8B3A3A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

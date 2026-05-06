"use client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TokenChartProps {
  data: any[];
}

export function DailyTokensChart({ data }: TokenChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="input_tokens" fill="#4A7C59" name="Input" />
        <Bar dataKey="output_tokens" fill="#A07C40" name="Output" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CumulativeCostChart({ data }: TokenChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="estimated_cost_sonnet" stroke="#3D6B5B" name="Cost ($)" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TokensPerOfferChart({ data }: TokenChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="tokens_per_offer" stroke="#8B3A3A" name="Tokens/Offer" />
      </LineChart>
    </ResponsiveContainer>
  );
}

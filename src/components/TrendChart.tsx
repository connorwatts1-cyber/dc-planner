import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { LabourData } from '../types';

interface TrendChartProps {
  data: LabourData[] | Array<Record<string, string | number>>;
  type?: 'line' | 'bar';
}

export default function TrendChart({ data, type = 'line' }: TrendChartProps) {
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="absenceHours" fill="#2e8b57" name="Absence Hours" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="requiredHours" stroke="#0b6240" strokeWidth={3} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="scheduledHours" stroke="#9a6335" strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

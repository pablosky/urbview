import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAppStore } from '../../store/useAppStore';

export default function ChartPanel() {
  const { categoryData, selectedCategory, setSelectedCategory, loading, error } =
    useAppStore();

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (categoryData.length === 0)
    return <p className="muted">No buildings inside this area.</p>;

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={categoryData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            width={110}
            tick={{ fontSize: 11 }}
          />
          <Tooltip formatter={(v: number) => v.toLocaleString()} />
          <Bar
            dataKey="count"
            onClick={(d: any) => setSelectedCategory(d.category)}
            cursor="pointer"
          >
            {categoryData.map((d) => (
              <Cell
                key={d.category}
                fill={
                  selectedCategory === d.category ? '#1d4ed8' : '#93c5fd'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {selectedCategory && (
        <p className="muted" style={{ fontSize: 12 }}>
          Filtering: <strong>{selectedCategory}</strong> — click again to clear.
        </p>
      )}
    </div>
  );
}

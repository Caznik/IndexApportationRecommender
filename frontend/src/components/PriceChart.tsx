import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PricePoint } from '../api'

interface Props {
  data: PricePoint[]
  loading: boolean
}

export function PriceChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="w-full h-48 bg-surface-1 rounded-xl animate-pulse" />
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-48 bg-surface-1 rounded-xl flex items-center justify-center">
        <span className="text-ink-muted text-sm">No price data</span>
      </div>
    )
  }

  const tickInterval = Math.floor(data.length / 12)

  return (
    <div className="w-full h-48 bg-surface-1 rounded-xl p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6a4cf5" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#6a4cf5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: '#999999', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            }}
          />
          <YAxis
            tick={{ fill: '#999999', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1c1c',
              border: '1px solid #262626',
              borderRadius: '10px',
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
            labelFormatter={(label) => {
              const d = new Date(String(label))
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            }}
          />
          <Area
            type="monotone"
            dataKey="close_price"
            stroke="#6a4cf5"
            strokeWidth={1.5}
            fill="url(#priceGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#6a4cf5' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

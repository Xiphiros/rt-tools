import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StrainGraphProps {
    peaks: Record<string, number[]>;
}

export const StrainGraph = ({ peaks }: StrainGraphProps) => {
    // Basic aggregation for demo (Stream only)
    const streamPeaks = peaks['stream'] || [];
    const labels = streamPeaks.map((_, i) => (i * 0.4).toFixed(1)); // 400ms sections

    const data = {
        labels,
        datasets: [
            {
                label: 'Stream Strain',
                data: streamPeaks,
                borderColor: '#0ea5e9', // Sky 500
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                fill: true,
                tension: 0.3,
                pointRadius: 0
            },
            {
                label: 'Jack Strain',
                data: peaks['jack'] || [],
                borderColor: '#f43f5e', // Rose 500
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: '#94a3b8' }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
            }
        },
        scales: {
            x: {
                ticks: { color: '#64748b' },
                grid: { color: '#334155' }
            },
            y: {
                ticks: { color: '#64748b' },
                grid: { color: '#334155' },
                beginAtZero: true
            }
        }
    };

    return (
        <div className="h-64 w-full bg-card rounded-xl border border-border p-4 shadow-sm">
            <Line data={data} options={options} />
        </div>
    );
};
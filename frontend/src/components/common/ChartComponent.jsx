import React from 'react';
import { Bar, Line, Pie, Doughnut, PolarArea } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, RadialLinearScale } from 'chart.js';

// Register all ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
);

/**
 * ChartComponent - Reusable chart component for Pharma-360
 * Supports multiple chart types: Bar, Line, Pie, Doughnut, PolarArea
 * 
 * FRNT-010: Visualisation Graphiques
 */

const ChartComponent = ({
  type = 'bar',
  data,
  options = {},
  height = 300,
  className = '',
  ...props
}) => {
  // Default options for all chart types
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            } else if (context.parsed.r !== null) {
              label += context.parsed.r;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          drawBorder: false,
        },
      },
      y: {
        grid: {
          display: true,
          drawBorder: false,
        },
        beginAtZero: true,
      },
    },
  };

  // Merge default options with custom options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
    },
    scales: {
      ...defaultOptions.scales,
      ...options.scales,
    },
  };

  // Render the appropriate chart type
  const renderChart = () => {
    switch (type.toLowerCase()) {
      case 'bar':
        return <Bar data={data} options={mergedOptions} height={height} {...props} />;
      case 'line':
        return <Line data={data} options={mergedOptions} height={height} {...props} />;
      case 'pie':
        return <Pie data={data} options={mergedOptions} height={height} {...props} />;
      case 'doughnut':
        return <Doughnut data={data} options={mergedOptions} height={height} {...props} />;
      case 'polar':
      case 'polararea':
        return <PolarArea data={data} options={mergedOptions} height={height} {...props} />;
      default:
        return <Bar data={data} options={mergedOptions} height={height} {...props} />;
    }
  };

  return (
    <div className={`chart-container ${className}`} style={{ height: `${height}px` || '300px' }}>
      {renderChart()}
    </div>
  );
};

// Pre-configured chart types for easier usage

/**
 * BarChart - Pre-configured bar chart
 */
export const BarChart = ({ data, options = {}, ...props }) => (
  <ChartComponent type="bar" data={data} options={options} {...props} />
);

/**
 * LineChart - Pre-configured line chart
 */
export const LineChart = ({ data, options = {}, ...props }) => (
  <ChartComponent type="line" data={data} options={options} {...props} />
);

/**
 * PieChart - Pre-configured pie chart
 */
export const PieChart = ({ data, options = {}, ...props }) => (
  <ChartComponent type="pie" data={data} options={options} {...props} />
);

/**
 * DoughnutChart - Pre-configured doughnut chart
 */
export const DoughnutChart = ({ data, options = {}, ...props }) => (
  <ChartComponent type="doughnut" data={data} options={options} {...props} />
);

/**
 * PolarChart - Pre-configured polar area chart
 */
export const PolarChart = ({ data, options = {}, ...props }) => (
  <ChartComponent type="polar" data={data} options={options} {...props} />
);

/**
 * SalesBarChart - Pre-configured chart for daily sales
 */
export const SalesBarChart = ({ data, title = 'Ventes Quotidiennes' }) => {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label: 'Nombre de ventes',
        data: data.data || [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 18,
        },
      },
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return <ChartComponent type="bar" data={chartData} options={chartOptions} />;
};

/**
 * TopProductsPieChart - Pre-configured chart for top products
 */
export const TopProductsPieChart = ({ data, title = 'Top 5 Produits' }) => {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        data: data.data || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(239, 68, 68, 0.5)',
          'rgba(139, 92, 246, 0.5)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 18,
        },
      },
    },
  };

  return <ChartComponent type="pie" data={chartData} options={chartOptions} />;
};

/**
 * CategoryDistributionChart - Pre-configured chart for category distribution
 */
export const CategoryDistributionChart = ({ data, title = 'Répartition par Catégorie' }) => {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        data: data.data || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(239, 68, 68, 0.5)',
          'rgba(139, 92, 246, 0.5)',
          'rgba(236, 72, 153, 0.5)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 18,
        },
      },
    },
  };

  return <ChartComponent type="doughnut" data={chartData} options={chartOptions} />;
};

/**
 * StockRotationLineChart - Pre-configured chart for stock rotation
 */
export const StockRotationLineChart = ({ data, title = 'Rotation des Stocks' }) => {
  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label: 'Rotation (unités/jour)',
        data: data.data || [],
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 18,
        },
      },
      legend: {
        display: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return <ChartComponent type="line" data={chartData} options={chartOptions} />;
};

export default ChartComponent;

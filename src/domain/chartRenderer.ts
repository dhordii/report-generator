import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import type { AnalysisResult, ReportChartImages } from './types';

Chart.register(...registerables);

const palette = ['#2563EB', '#14804A', '#B45309', '#7C3AED', '#0891B2', '#DC2626', '#64748B'];

async function renderChart(configuration: ChartConfiguration): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 420;
  canvas.style.position = 'fixed';
  canvas.style.left = '-10000px';
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable in this browser.');
  const options: NonNullable<ChartConfiguration['options']> = {
    responsive: false,
    animation: false,
    devicePixelRatio: 2,
    color: '#475467',
    font: { family: 'Arial', size: 11 },
    plugins: { legend: { position: 'top', labels: { usePointStyle: true } } },
  };
  if (configuration.type !== 'pie' && configuration.type !== 'doughnut') {
    options.scales = {
      x: { grid: { display: false }, ticks: { color: '#667085' } },
      y: { beginAtZero: true, grid: { color: '#E5E7EB' }, ticks: { color: '#667085' } },
    };
  }
  Object.assign(options, configuration.options);
  const chart = new Chart(context, { ...configuration, options });
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  canvas.remove();
  return dataUrl;
}

function currencyAxis() {
  return {
    beginAtZero: true,
    grid: { color: '#E5E7EB' },
    ticks: { color: '#667085', callback: (value: string | number) => `$${Number(value).toLocaleString('en-US')}` },
  };
}

export async function renderReportCharts(result: AnalysisResult): Promise<ReportChartImages> {
  const topProducts = result.products.slice(0, 10);
  const topCustomers = result.customers.slice(0, 10);
  const categoryNames = result.categories.map((item) => item.category);
  const customerCategories = [...new Set(topCustomers.flatMap((customer) => Object.keys(customer.categories)))];

  const [monthly, products, customers, units, categories] = await Promise.all([
    renderChart({
      type: 'line',
      data: {
        labels: result.months.map((item) => item.month),
        datasets: [
          { label: 'Revenue', data: result.months.map((item) => item.revenue), borderColor: palette[0], backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: 0.25 },
          { label: 'Estimated profit', data: result.months.map((item) => item.estimatedProfit), borderColor: palette[1], backgroundColor: 'transparent', tension: 0.25 },
        ],
      },
      options: { plugins: { title: { display: true, text: 'Revenue and Profit by Month' }, legend: { position: 'top' } }, scales: { x: { grid: { display: false } }, y: currencyAxis() } },
    }),
    renderChart({
      type: 'bar',
      data: {
        labels: topProducts.map((item) => item.productName),
        datasets: [
          { label: 'Revenue', data: topProducts.map((item) => item.revenue), backgroundColor: palette[0] },
          { label: 'Estimated profit', data: topProducts.map((item) => item.estimatedProfit), backgroundColor: palette[1] },
        ],
      },
      options: { indexAxis: 'y', plugins: { title: { display: true, text: 'Top 10 Products by Revenue and Profit' }, legend: { position: 'top' } }, scales: { x: currencyAxis(), y: { grid: { display: false } } } },
    }),
    renderChart({
      type: 'bar',
      data: {
        labels: topCustomers.map((item) => item.customerId),
        datasets: customerCategories.map((category, index) => ({
          label: category,
          data: topCustomers.map((customer) => customer.categories[category] ?? 0),
          backgroundColor: palette[index % palette.length],
        })),
      },
      options: { plugins: { title: { display: true, text: 'Top 10 Customers: Spending by Category' }, legend: { position: 'top' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { ...currencyAxis(), stacked: true } } },
    }),
    renderChart({
      type: 'bar',
      data: { labels: topProducts.map((item) => item.productName), datasets: [{ label: 'Units sold', data: topProducts.map((item) => item.units), backgroundColor: palette[2] }] },
      options: { indexAxis: 'y', plugins: { title: { display: true, text: 'Units Sold by Product' }, legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: '#E5E7EB' } }, y: { grid: { display: false } } } },
    }),
    renderChart({
      type: 'bar',
      data: { labels: categoryNames, datasets: [{ label: 'Revenue', data: result.categories.map((item) => item.revenue), backgroundColor: palette.slice(0, Math.max(1, categoryNames.length)) }] },
      options: { plugins: { title: { display: true, text: 'Revenue by Category' }, legend: { display: false } }, scales: { x: { grid: { display: false } }, y: currencyAxis() } },
    }),
  ]);

  return { monthly, products, customers, units, categories };
}

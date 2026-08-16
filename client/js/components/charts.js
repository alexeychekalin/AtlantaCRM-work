/* Charts — Canvas графики */
const Charts = {

  // Цветовая палитра
  colors: [
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#22c55e', '#ef4444', '#06b6d4', '#a855f7', '#f97316',
  ],

  // Bar Chart
  drawBarChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const padding = { top: 20, right: 20, bottom: 50, left: 60 };

    const labels = data.map(d => d.label);
    const values = data.map(d => d.value);
    const maxVal = Math.max(...values, 1);

    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;
    const barWidth = Math.min(40, chartW / labels.length - 8);
    const gap = (chartW - barWidth * labels.length) / (labels.length + 1);

    // Grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();

      // Label
      const val = maxVal - (maxVal / 4) * i;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(this.shortNumber(val), padding.left - 8, y + 4);
    }

    // Bars
    labels.forEach((label, i) => {
      const x = padding.left + gap + (barWidth + gap) * i;
      const barH = (values[i] / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      // Gradient bar
      const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      grad.addColorStop(0, this.colors[i % this.colors.length]);
      grad.addColorStop(1, this.colors[i % this.colors.length] + '40');

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fillStyle = grad;
      ctx.fill();

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barWidth / 2, H - padding.bottom + 16);
    });
  },

  // Donut Chart
  drawDonutChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const cx = W / 2;
    const cy = H / 2 - 10;
    const radius = Math.min(cx, cy) - 20;
    const innerRadius = radius * 0.6;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;

    const statusColors = {
      'new': '#38bdf8',
      'in_progress': '#3b82f6',
      'paid': '#eab308',
      'completed': '#22c55e',
      'cancelled': '#ef4444',
    };

    data.forEach((item, i) => {
      const sliceAngle = (item.value / total) * Math.PI * 2;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = statusColors[item.key] || this.colors[i % this.colors.length];
      ctx.fill();

      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 20px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter';
    ctx.fillText('заказов', cx, cy + 20);

    // Legend
    let ly = H - 30;
    const legendW = data.length * 100;
    let lx = (W - legendW) / 2;
    ctx.font = '10px Inter';

    data.forEach((item, i) => {
      const color = statusColors[item.key] || this.colors[i % this.colors.length];
      ctx.fillStyle = color;
      ctx.fillRect(lx, ly, 10, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.label} (${item.value})`, lx + 14, ly + 9);
      lx += ctx.measureText(`${item.label} (${item.value})`).width + 26;
    });
  },

  shortNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'М';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'К';
    return Math.round(num).toString();
  },
};

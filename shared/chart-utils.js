const Charts = {
  bar(data, { width = 280, height = 140, barColor = '#6c63ff', labelColor = '#9ca0b0', title = '' } = {}) {
    if (!data || data.length === 0) return '<p style="color:#9ca0b0;font-size:12px;">No data</p>';
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const barWidth = Math.max(8, Math.min(30, (width - 40) / data.length - 4));
    const pad = { top: title ? 20 : 8, right: 8, bottom: 24, left: 8 };
    const chartW = width;
    const chartH = height;
    const innerH = chartH - pad.top - pad.bottom;
    const innerW = chartW - pad.left - pad.right;

    let bars = '';
    data.forEach((d, i) => {
      const barH = Math.max(2, (d.value / maxVal) * innerH);
      const x = pad.left + (i * (innerW / data.length)) + ((innerW / data.length) - barWidth) / 2;
      const y = chartH - pad.bottom - barH;
      const color = d.color || barColor;
      bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3" fill="${color}" opacity="0.85">
        <title>${d.label || ''}: ${d.value}${d.suffix || ''}</title>
      </rect>`;
      bars += `<text x="${x + barWidth / 2}" y="${chartH - 6}" text-anchor="middle" fill="${labelColor}" font-size="9">${d.label || ''}</text>`;
    });

    const titleEl = title ? `<text x="${chartW / 2}" y="14" text-anchor="middle" fill="${labelColor}" font-size="11" font-weight="600">${title}</text>` : '';

    return `<svg width="${chartW}" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}" xmlns="http://www.w3.org/2000/svg">
      ${titleEl}
      ${bars}
    </svg>`;
  },

  line(data, { width = 280, height = 120, lineColor = '#6c63ff', fillColor = 'rgba(108,99,255,0.1)', labelColor = '#9ca0b0', title = '' } = {}) {
    if (!data || data.length < 2) return '<p style="color:#9ca0b0;font-size:12px;">Need at least 2 data points</p>';
    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const pad = { top: title ? 20 : 8, right: 8, bottom: 20, left: 8 };
    const innerH = height - pad.top - pad.bottom;
    const innerW = width - pad.left - pad.right;

    let points = '';
    let areaPoints = '';
    data.forEach((d, i) => {
      const x = pad.left + (i / (data.length - 1)) * innerW;
      const y = pad.top + innerH - (d.value / maxVal) * innerH;
      points += `${i === 0 ? 'M' : 'L'}${x},${y} `;
      areaPoints += `${i === 0 ? 'M' : 'L'}${x},${y} `;
    });

    const lastX = pad.left + innerW;
    const lastY = pad.top + innerH;
    areaPoints += `L${lastX},${lastY} L${pad.left},${lastY} Z`;

    const titleEl = title ? `<text x="${width / 2}" y="14" text-anchor="middle" fill="${labelColor}" font-size="11" font-weight="600">${title}</text>` : '';

    let labels = '';
    const labelStep = Math.max(1, Math.floor(data.length / 5));
    data.forEach((d, i) => {
      if (i % labelStep === 0 || i === data.length - 1) {
        const x = pad.left + (i / (data.length - 1)) * innerW;
        labels += `<text x="${x}" y="${height - 4}" text-anchor="middle" fill="${labelColor}" font-size="8">${d.label || ''}</text>`;
      }
    });

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${titleEl}
      <path d="${areaPoints}" fill="${fillColor}" />
      <path d="${points}" fill="none" stroke="${lineColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      ${labels}
    </svg>`;
  },

  donut(data, { width = 120, height = 120, size = 80, innerRatio = 0.6, labelColor = '#9ca0b0' } = {}) {
    if (!data || data.length === 0) return '<p style="color:#9ca0b0;font-size:12px;">No data</p>';
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const cx = width / 2, cy = height / 2;
    const r = size / 2;
    const innerR = r * innerRatio;

    const colors = ['#6c63ff', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7'];
    let cumulative = 0;
    let slices = '';
    let legend = '';

    data.forEach((d, i) => {
      const pct = d.value / total;
      const angle = pct * 360;
      const startRad = ((cumulative - 90) * Math.PI) / 180;
      const endRad = ((cumulative + angle - 90) * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const large = angle > 180 ? 1 : 0;
      const color = d.color || colors[i % colors.length];

      slices += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${color}" opacity="0.85" />`;

      const midRad = ((cumulative + angle / 2 - 90) * Math.PI) / 180;
      const lx = cx + (r + 14) * Math.cos(midRad);
      const ly = cy + (r + 14) * Math.sin(midRad);
      if (pct > 0.05) {
        slices += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="${labelColor}" font-size="8">${Math.round(pct * 100)}%</text>`;
      }

      cumulative += angle;
      if (d.label) {
        legend += `<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:${labelColor};margin:2px 0;">
          <span style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0;"></span>
          ${d.label}: ${d.value}
        </div>`;
      }
    });

    const hole = `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="#1a1d27" />`;

    return `<div style="display:flex;align-items:center;gap:12px;">
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${slices}${hole}</svg>
      <div>${legend}</div>
    </div>`;
  },

  sparkline(values, { width = 120, height = 28, color = '#6c63ff' } = {}) {
    if (!values || values.length < 2) return '<span style="color:#9ca0b0;font-size:11px;">—</span>';
    const min = Math.min(...values);
    const max = Math.max(...values) || 1;
    const range = max - min || 1;
    const pad = 2;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;

    let points = '';
    values.forEach((v, i) => {
      const x = pad + (i / (values.length - 1)) * innerW;
      const y = pad + innerH - ((v - min) / range) * innerH;
      points += `${i === 0 ? 'M' : 'L'}${x},${y} `;
    });

    const trend = values[values.length - 1] > values[0] ? '#22c55e' : '#ef4444';
    const lineCol = color;

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <path d="${points}" fill="none" stroke="${lineCol}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${pad + innerW}" cy="${pad + innerH - ((values[values.length - 1] - min) / range) * innerH}" r="2" fill="${trend}" />
    </svg>`;
  },

  histogram(data, { width = 280, height = 100, color = '#6c63ff', bins = 10 } = {}) {
    if (!data || data.length === 0) return '<p style="color:#9ca0b0;font-size:12px;">No data</p>';
    if (data.length <= bins) return this.bar(data, { width, height, barColor: color });

    const min = Math.min(...data.map((d) => d.value));
    const max = Math.max(...data.map((d) => d.value));
    const range = max - min || 1;
    const binSize = range / bins;

    const binned = Array.from({ length: bins }, (_, i) => {
      const lo = min + i * binSize;
      const hi = lo + binSize;
      return {
        label: `${Math.round(lo)}-${Math.round(hi)}`,
        value: data.filter((d) => d.value >= lo && d.value < hi).length,
      };
    });

    return this.bar(binned, { width, height, barColor: color, labelColor: 'transparent' });
  },
};

self.Charts = Charts;

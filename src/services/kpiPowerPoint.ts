import pptxgen from 'pptxgenjs';

export interface KpiExportRole {
  role: string;
  productivityKpi: number;
  actualProductivity: number;
  targetProductivity: number;
  targetHours: number;
  scheduledHours: number;
  hourVariance: number;
  achievedWeeks: number;
  volume: number;
  status: { label: string; color: string };
}

export interface KpiExportSummary {
  label: string;
  requiredHours: number;
  scheduledHours: number;
  capability: number;
  variance: number;
}

function hexColor(value: string): string {
  return value.replace('#', '').toUpperCase();
}

export async function exportKpiPowerPoint(summary: KpiExportSummary, roles: KpiExportRole[], fileName: string) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'DC Planner';
  pptx.subject = 'Role KPI and productivity pack';
  pptx.title = `DC Planner KPI Pack - ${summary.label}`;
  pptx.company = 'DC Planner';
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos'
  };

  const navy = '102D6E';
  const green = '6CAF45';
  const red = 'D62828';
  const pale = 'F4F7FB';
  const grey = '64748B';

  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: navy };
  titleSlide.addText('DC Planner', { x: 0.7, y: 1.0, w: 11.8, h: 0.6, fontSize: 30, bold: true, color: 'FFFFFF' });
  titleSlide.addText('Role KPI & Productivity Pack', { x: 0.7, y: 1.8, w: 11.8, h: 0.5, fontSize: 22, color: 'FFFFFF' });
  titleSlide.addText(summary.label, { x: 0.7, y: 2.55, w: 11.8, h: 0.4, fontSize: 16, color: 'DCE7FF' });
  titleSlide.addText('Source: uploaded STP, schedule and Settings productivity assumptions', { x: 0.7, y: 6.55, w: 11.8, h: 0.25, fontSize: 10, color: 'DCE7FF' });

  const summarySlide = pptx.addSlide();
  summarySlide.addText('Executive KPI Summary', { x: 0.45, y: 0.25, w: 12.3, h: 0.35, fontSize: 20, bold: true, color: navy });
  summarySlide.addText(summary.label, { x: 0.45, y: 0.65, w: 12.3, h: 0.25, fontSize: 10, color: grey });
  const cards = [
    ['Required Hours', Math.ceil(summary.requiredHours).toLocaleString()],
    ['Scheduled Hours', Math.ceil(summary.scheduledHours).toLocaleString()],
    ['Overall KPI', `${summary.capability.toFixed(1)}%`],
    ['Hour Variance', Math.ceil(summary.variance).toLocaleString()]
  ];
  cards.forEach(([label, value], index) => {
    const x = 0.45 + index * 3.1;
    summarySlide.addShape(pptx.ShapeType.roundRect, { x, y: 1.25, w: 2.75, h: 1.1, rectRadius: 0.05, fill: { color: 'FFFFFF' }, line: { color: 'D8E0EA' } });
    summarySlide.addText(label, { x: x + 0.15, y: 1.43, w: 2.4, h: 0.2, fontSize: 9, color: grey, bold: true, breakLine: false });
    summarySlide.addText(value, { x: x + 0.15, y: 1.72, w: 2.4, h: 0.35, fontSize: 20, color: navy, bold: true });
  });
  summarySlide.addText('Status rules', { x: 0.45, y: 2.85, w: 1.5, h: 0.25, fontSize: 12, bold: true, color: navy });
  summarySlide.addText('Red: below 100% productivity   |   Green: 100% or above   |   KPI calculated from STP volume, scheduled hours and Settings baseline', { x: 0.45, y: 3.2, w: 12, h: 0.3, fontSize: 11, color: grey });
  summarySlide.addText('Role KPI Snapshot', { x: 0.45, y: 4.05, w: 2.5, h: 0.3, fontSize: 15, bold: true, color: navy });
  summarySlide.addTable(roles.map(role => [role.role, `${role.productivityKpi.toFixed(1)}%`, `${Math.ceil(role.achievedWeeks)} weeks`, role.status.label]) as any, {
    x: 0.45, y: 4.45, w: 12, h: 1.7,
    border: { type: 'solid', color: 'D8E0EA', pt: 1 },
    fill: { color: pale },
    color: '172B55',
    fontSize: 10,
    bold: false,
    rowH: 0.27,
    margin: 0.06,
    colW: [3.8, 2, 2.2, 2]
  });

  const detailSlide = pptx.addSlide();
  detailSlide.addText('Role KPI Detail', { x: 0.45, y: 0.25, w: 12, h: 0.35, fontSize: 20, bold: true, color: navy });
  detailSlide.addText(summary.label, { x: 0.45, y: 0.65, w: 12, h: 0.25, fontSize: 10, color: grey });
  detailSlide.addTable([
    ['Role', 'KPI %', 'Actual rate', 'Target rate', 'Target hours', 'Scheduled', 'Variance', 'Achieved'],
    ...roles.map(role => [role.role, `${role.productivityKpi.toFixed(1)}%`, role.actualProductivity.toFixed(1), role.targetProductivity.toFixed(1), Math.ceil(role.targetHours), Math.ceil(role.scheduledHours), Math.ceil(role.hourVariance), `${role.achievedWeeks}`])
  ] as any, {
    x: 0.35, y: 1.1, w: 12.55, h: 2.35,
    border: { type: 'solid', color: 'D8E0EA', pt: 1 },
    fill: { color: 'FFFFFF' }, color: '172B55', fontSize: 8, rowH: 0.27, margin: 0.04,
    colW: [2.2, 1.05, 1.15, 1.15, 1.25, 1.1, 1.05, 0.95]
  });
  detailSlide.addText('Role productivity donuts', { x: 0.45, y: 3.8, w: 3, h: 0.25, fontSize: 14, bold: true, color: navy });

  roles.forEach((role, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const x = 0.45 + column * 2.5;
    const y = 4.25 + row * 2.05;
    const achieved = Math.max(role.achievedWeeks, 0);
    const remaining = Math.max(roles.length > 0 ? Math.max(1, achieved + 1) - achieved : 1, 0);
    const total = Math.max(achieved + remaining, 1);
    detailSlide.addText(role.role, { x, y, w: 2.1, h: 0.25, fontSize: 10, bold: true, align: 'center', color: '172B55' });
    detailSlide.addChart(pptx.ChartType.doughnut, [{ name: role.role, labels: ['Achieved', 'Remaining'], values: [achieved, total - achieved] }], {
      x: x + 0.42, y: y + 0.3, w: 1.25, h: 1.25,
      holeSize: 68, showLegend: false, showTitle: false, showValue: false,
      chartColors: [role.status.color === '#c62828' ? red : green, 'E9EDF1'],
      border: { color: 'FFFFFF', pt: 0 },
      showPercent: false
    });
    detailSlide.addText(`${role.productivityKpi.toFixed(1)}%`, { x: x + 0.4, y: y + 0.78, w: 1.3, h: 0.2, fontSize: 11, bold: true, align: 'center', color: hexColor(role.status.color) });
    detailSlide.addText(`${achieved} / ${total} weeks`, { x, y: y + 1.62, w: 2.1, h: 0.2, fontSize: 9, align: 'center', color: grey });
  });

  await pptx.writeFile({ fileName });
}

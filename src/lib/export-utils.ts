import { DailyLog, FuelTransaction, Profile, VehicleAssignment } from '@/types/database';
import { DateRangeSelection, formatDateRangeLabel } from '@/lib/date-utils';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export interface ExportHistoryOptions {
  activeTab?: 'logs' | 'fuel' | 'all';
  logs: DailyLog[];
  fuel: FuelTransaction[];
  dateRange: DateRangeSelection;
  driver?: Profile | null;
  assignment?: VehicleAssignment | null;
}

/**
 * Builds RFC 4180 compliant CSV string content for staff history.
 */
export function buildStaffHistoryCsvContent(options: ExportHistoryOptions): string {
  const { logs, fuel, dateRange, driver, assignment, activeTab = 'logs' } = options;
  const plate = assignment?.vehicle?.plate_number || 'UNASSIGNED';
  const driverName = driver?.full_name || 'Driver';
  const employeeId = driver?.employee_id || 'N/A';
  const dateLabel = formatDateRangeLabel(dateRange);

  const lines: string[] = [];

  // Header metadata block
  lines.push(`"Vehicle & Logistics Management System (VLMS) - Staff Submissions Export"`);
  lines.push(`"Driver Name","${escapeCsv(driverName)}","Employee ID","${escapeCsv(employeeId)}"`);
  lines.push(`"Vehicle Plate","${escapeCsv(plate)}","Date Range Window","${escapeCsv(dateLabel)}"`);
  lines.push(`"Export Timestamp","${escapeCsv(new Date().toISOString())}"`);
  lines.push(''); // Blank separator line

  if (activeTab === 'logs' || activeTab === 'all') {
    lines.push(`"--- DAILY ODOMETER LOGS (${logs.length} records) ---"`);
    const logHeaders = [
      'Log ID',
      'Business Date',
      'Vehicle Plate',
      'Driver Name',
      'Employee ID',
      'Confirmed Odometer (KM)',
      'Daily Distance (KM)',
      'Source Reading',
      'Source Unit',
      'Status',
      'Submitted At',
    ];
    lines.push(logHeaders.map((h) => `"${h}"`).join(','));

    for (const log of logs) {
      const row = [
        log.id,
        log.business_date,
        log.vehicle?.plate_number || plate,
        driverName,
        employeeId,
        log.odometer_km,
        log.mileage_difference_km ?? 0,
        log.source_reading ?? log.odometer_km,
        log.source_unit ?? 'km',
        log.status,
        log.submitted_at,
      ];
      lines.push(row.map((cell) => `"${escapeCsv(String(cell ?? ''))}"`).join(','));
    }
    lines.push('');
  }

  if (activeTab === 'fuel' || activeTab === 'all') {
    lines.push(`"--- FUEL TRANSACTIONS (${fuel.length} records) ---"`);
    const fuelHeaders = [
      'Transaction ID',
      'Purchased Date',
      'Vehicle Plate',
      'Driver Name',
      'Employee ID',
      'Vendor / Station Name',
      'Payment Method',
      'Amount (NGN)',
      'Quantity (Litres)',
      'Odometer at Purchase (KM)',
      'Status',
      'Submitted At',
    ];
    lines.push(fuelHeaders.map((h) => `"${h}"`).join(','));

    for (const tx of fuel) {
      const row = [
        tx.id,
        tx.purchased_at ? tx.purchased_at.slice(0, 10) : tx.submitted_at.slice(0, 10),
        tx.vehicle?.plate_number || plate,
        driverName,
        employeeId,
        tx.vendor_name,
        tx.payment_method,
        tx.amount,
        tx.quantity_litres,
        tx.odometer_km,
        tx.status,
        tx.submitted_at,
      ];
      lines.push(row.map((cell) => `"${escapeCsv(String(cell ?? ''))}"`).join(','));
    }
  }

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Generates an RFC 4180 compliant CSV string and triggers a browser download.
 */
export function exportStaffHistoryToCsv(options: ExportHistoryOptions): void {
  const { dateRange, assignment, activeTab = 'logs' } = options;
  const plate = assignment?.vehicle?.plate_number || 'UNASSIGNED';
  const csvContent = buildStaffHistoryCsvContent(options);
  const filename = generateExportFilename(plate, activeTab, dateRange, 'csv');
  triggerBrowserDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Generates an executive-formatted PDF audit report and triggers print/save as PDF.
 */
export function exportStaffHistoryToPdf(options: ExportHistoryOptions): void {
  const { logs, fuel, dateRange, driver, assignment, activeTab = 'logs' } = options;
  const plate = assignment?.vehicle?.plate_number || 'UNASSIGNED';
  const carName = assignment?.vehicle?.car_name || assignment?.vehicle?.make || 'Company Vehicle';
  const driverName = driver?.full_name || 'Driver';
  const employeeId = driver?.employee_id || 'N/A';
  const dateLabel = formatDateRangeLabel(dateRange);

  const totalKm = logs.reduce((sum, l) => sum + (l.mileage_difference_km || 0), 0);
  const totalSpend = fuel.reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalLitres = fuel.reduce((sum, f) => sum + (f.quantity_litres || 0), 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to download and print your PDF report.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VLMS Staff History Report - ${plate}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 12mm 15mm 12mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .report-subtitle {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .meta-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 3px;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      background: #ffffff;
      text-align: center;
    }
    .kpi-num {
      font-size: 15px;
      font-weight: 800;
      color: #1e3a8a;
      margin-top: 2px;
    }
    .kpi-lbl {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    h3 {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 16px;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 9px;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .badge-approved {
      background: #dcfce7;
      color: #166534;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      display: inline-block;
    }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <div class="brand-title">VLMS FLEET AUDIT REPORT</div>
      <div class="report-subtitle">Staff Submissions & Compliance Log Summary</div>
    </div>
    <div style="text-align: right;">
      <span style="font-weight: 700; color: #1e3a8a;">OFFICIAL RECORD</span>
      <div style="font-size: 9px; color: #64748b;">Generated: ${formatDateTime(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Driver Name:</span>
      <span class="meta-val">${driverName}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Employee ID:</span>
      <span class="meta-val">${employeeId}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Assigned Vehicle:</span>
      <span class="meta-val">${plate} (${carName})</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Date Filter Window:</span>
      <span class="meta-val">${dateLabel}</span>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-lbl">Total Logs</div>
      <div class="kpi-num">${logs.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Distance Traveled</div>
      <div class="kpi-num">${totalKm.toLocaleString()} KM</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Fuel Purchases</div>
      <div class="kpi-num">${fuel.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Total Fuel Spend</div>
      <div class="kpi-num">${formatCurrency(totalSpend)}</div>
    </div>
  </div>

  ${
    activeTab === 'logs' || activeTab === 'all'
      ? `
  <h3>Daily Odometer Verification Logs (${logs.length})</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Vehicle Plate</th>
        <th>Odometer Reading</th>
        <th>Daily Distance</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${
        logs.length === 0
          ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 12px;">No odometer logs recorded for this date range.</td></tr>`
          : logs
              .map(
                (l) => `
        <tr>
          <td><strong>${l.business_date}</strong></td>
          <td>${plate}</td>
          <td>${l.odometer_km.toLocaleString()} KM</td>
          <td>+${(l.mileage_difference_km || 0).toLocaleString()} KM</td>
          <td><span class="badge-approved">${l.status.toUpperCase()}</span></td>
        </tr>`
              )
              .join('')
      }
    </tbody>
  </table>`
      : ''
  }

  ${
    activeTab === 'fuel' || activeTab === 'all'
      ? `
  <h3>Fuel Transactions & Invoices (${fuel.length})</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Vendor / Station</th>
        <th>Payment Method</th>
        <th>Litres</th>
        <th>Amount</th>
        <th>Odometer</th>
      </tr>
    </thead>
    <tbody>
      ${
        fuel.length === 0
          ? `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">No fuel purchases recorded for this date range.</td></tr>`
          : fuel
              .map(
                (f) => `
        <tr>
          <td><strong>${(f.purchased_at || f.submitted_at).slice(0, 10)}</strong></td>
          <td>${f.vendor_name || 'Filling Station'}</td>
          <td style="text-transform: capitalize;">${f.payment_method.replace('_', ' ')}</td>
          <td>${(f.quantity_litres || 0).toFixed(1)} L</td>
          <td><strong>${formatCurrency(f.amount || 0)}</strong></td>
          <td>${(f.odometer_km || 0).toLocaleString()} KM</td>
        </tr>`
              )
              .join('')
      }
    </tbody>
  </table>`
      : ''
  }

  <div class="footer">
    Vehicle & Logistics Management System (VLMS) • Confidential Internal Fleet Audit Record
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Helper to escape RFC 4180 CSV characters.
 */
function escapeCsv(val: string): string {
  return val.replace(/"/g, '""');
}

/**
 * Builds standard date-range suffixed filenames.
 */
function generateExportFilename(
  plate: string,
  tab: string,
  dateRange: DateRangeSelection,
  ext: string
): string {
  const cleanPlate = plate.replace(/[^A-Za-z0-9_-]/g, '').toLowerCase();
  let dateSuffix = 'all-time';

  if (dateRange.startDate && dateRange.endDate) {
    dateSuffix = `${dateRange.startDate}-to-${dateRange.endDate}`;
  } else if (dateRange.startDate) {
    dateSuffix = `from-${dateRange.startDate}`;
  } else if (dateRange.endDate) {
    dateSuffix = `until-${dateRange.endDate}`;
  }

  return `vlms-${cleanPlate}-${tab}-${dateSuffix}.${ext}`;
}

/**
 * Dispatches an automated file download in the browser.
 */
function triggerBrowserDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

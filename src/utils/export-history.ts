
'use client';

import { PermissionLog } from '@/lib/types';
import { format } from 'date-fns';
import Papa from 'papaparse';

/**
 * Converts an array of permission logs to a CSV string and triggers a download.
 * @param history The array of PermissionLog objects to export.
 * @param filename The desired name for the downloaded file.
 */
export function exportHistoryToCSV(history: PermissionLog[], filename: string = 'permissions_history.csv') {
  if (!history || history.length === 0) {
    console.error("No history data provided to export.");
    return;
  }

  // Flatten the data so each permission change is its own row
  const flattenedData = history.flatMap(log => 
    log.changed.map(change => ({
      logId: log.id,
      timestamp: log.createdAt.toDate().toISOString(),
      actorEmail: log.actorEmail,
      scope: log.scope,
      targetOrgName: log.orgName,
      targetUserEmail: log.userEmail || 'N/A',
      action: log.action,
      permissionKey: change.key,
      fromValue: change.from,
      toValue: change.to,
      notes: log.notes || '',
    }))
  );

  const csv = Papa.unparse(flattenedData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a new window with a printable HTML view of the permission history.
 * @param history The array of PermissionLog objects to display.
 * @param filtersSummary A string summarizing the active filters.
 */
export function openHistoryPrintView(history: PermissionLog[], filtersSummary: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the history.');
    return;
  }

  const tableRows = history.map(log => `
    <tr class="log-entry">
      <td>${format(log.createdAt.toDate(), 'PPpp')}</td>
      <td>${log.actorEmail}</td>
      <td>${log.scope}</td>
      <td>${log.scope === 'user' ? (log.userEmail || 'N/A') : log.orgName}</td>
      <td>${log.action}</td>
      <td class="changes">${log.changed.map(c => `<div><strong>${c.key}</strong>: ${c.from} → ${c.to}</div>`).join('')}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <title>Permissions History</title>
        <style>
          body { font-family: sans-serif; margin: 2rem; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
          th { background-color: #f2f2f2; }
          .log-entry:nth-child(even) { background-color: #f9f9f9; }
          .changes div { margin-bottom: 4px; }
          .header { margin-bottom: 2rem; }
          h1 { font-size: 1.5rem; }
          p { color: #555; }
          @media print {
            body { margin: 1rem; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Permissions Audit Trail</h1>
          <p><strong>Filters:</strong> ${filtersSummary || 'None'}</p>
          <p>Generated on ${format(new Date(), 'PPpp')}</p>
          <button class="no-print" onclick="window.print()">Print</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Scope</th>
              <th>Target</th>
              <th>Action</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

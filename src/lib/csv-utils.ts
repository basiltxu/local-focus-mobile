'use client';

/**
 * Generates and triggers the download of a CSV template for user imports.
 * @param orgName The name of the organization to generate the template for.
 */
export function generateOrgCsvTemplate(orgName: string) {
  const domain = orgName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const csvContent = `fullName,email,role
John Doe,john.doe@${domain}.org,User
Jane Admin,jane.admin@${domain}.org,orgAdmin
`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.href) {
    URL.revokeObjectURL(link.href);
  }
  link.href = URL.createObjectURL(blob);
  link.download = `${orgName.replace(/\s+/g, '_')}_user_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
    
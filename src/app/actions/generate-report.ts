'use server';

import { generateReportFlow } from "@/ai/flows/generate-report-flow";
import { Category, Incident, ReportData, SubCategory } from "@/lib/types";

export async function generateReport(
  incidents: Incident[],
  categories: Category[],
  subCategories: SubCategory[]
): Promise<ReportData> {
  if (!incidents.length) {
    throw new Error('No incidents to generate a report from.');
  }

  const result = await generateReportFlow({ incidents, categories, subCategories });
  return result;
}

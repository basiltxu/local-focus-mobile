
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, query, where, getDocs, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Incident, Category, SubCategory } from '@/lib/types';
import { collections } from '@/lib/paths';

// #region Data Fetching and Aggregation

type EnrichedIncident = {
  id: string;
  title: string;
  description?: string;
  categoryName: string;
  subcategoryName: string;
  status: string;
  createdAt?: Date;
  closedAt?: Date | null;
  durationHours?: number | null;
  location: string;
  coordinates?: { lat: number; lng: number };
};

async function loadCategoryLookup() {
  const catSnap = await getDocs(collection(db, collections.categories));
  const categories: Record<string, { name: string; sub: Record<string,string> }> = {};
  for (const c of catSnap.docs) {
    const data = c.data() as Category;
    categories[c.id] = { name: data.name || "Uncategorized", sub: {} };
    const subSnap = await getDocs(collection(db, `categories/${c.id}/subcategories`));
    subSnap.forEach(s => {
      categories[c.id].sub[s.id] = (s.data() as SubCategory).name || "General";
    });
  }
  return categories;
}

async function fetchIncidentDataForAI({ startDate, endDate }: { startDate: Date, endDate: Date }): Promise<EnrichedIncident[]> {
  const categories = await loadCategoryLookup();
  const q = query(
    collection(db, collections.incidents),
    where("organizationId", "==", "LOCAL_FOCUS_ORG_ID"),
    where("createdAt", ">=", Timestamp.fromDate(startDate)),
    where("createdAt", "<=", Timestamp.fromDate(endDate))
  );
  const snap = await getDocs(q);

  const rows: EnrichedIncident[] = [];
  snap.forEach(d => {
    const i = d.data() as any;
    const cat = categories[i.categoryId]?.name || "Uncategorized";
    const sub = categories[i.categoryId]?.sub?.[i.subCategoryId] || "General";
    const created = i.createdAt?.toDate?.() || undefined;
    const closed = i.closedAt?.toDate?.() || null;
    const duration = (created && closed) ? (closed.getTime() - created.getTime()) / 36e5 : null;
    
    rows.push({
      id: d.id,
      title: i.title,
      description: i.description,
      categoryName: cat,
      subcategoryName: sub,
      status: i.status || "open",
      createdAt: created,
      closedAt: closed,
      durationHours: duration,
      location: i.location || 'Unknown Location',
      coordinates: i.coordinates,
    });
  });
  return rows;
}

function aggregateIncidents(incidents: any[]) {
  const byCategory: Record<string, number> = {};
  const bySubcategory: Record<string, number> = {};
  const byLocationLabel: Record<string, number> = {};
  const daily: Record<string, number> = {};
  const heatPoints: { lat: number; lng: number; intensity: number }[] = [];

  let totalDuration = 0, closedCount = 0;

  incidents.forEach(i => {
    byCategory[i.categoryName] = (byCategory[i.categoryName] || 0) + 1;
    const subKey = `${i.categoryName} → ${i.subcategoryName}`;
    bySubcategory[subKey] = (bySubcategory[subKey] || 0) + 1;

    if (i.location) {
      byLocationLabel[i.location] = (byLocationLabel[i.location] || 0) + 1;
    }

    if (i.createdAt) {
      const day = i.createdAt.toISOString().slice(0,10);
      daily[day] = (daily[day] || 0) + 1;
    }

    if (i.durationHours != null) {
      totalDuration += i.durationHours;
      closedCount++;
    }

    if (i.coordinates?.lat && i.coordinates?.lng) {
      heatPoints.push({ lat: i.coordinates.lat, lng: i.coordinates.lng, intensity: 1 });
    }
  });

  const avgDuration = closedCount ? totalDuration / closedCount : 0;
  const longest = incidents.reduce((m, c) => (c.durationHours > (m?.durationHours || -1) ? c : m), null);

  return {
    byCategory, bySubcategory, byLocationLabel, daily,
    heatPoints, avgDuration, longest
  };
}

function computeHotspots(heatPoints: {lat:number;lng:number;intensity:number}[], cellSizeDeg = 0.02, threshold = 3) {
  const grid: Record<string, number> = {};
  heatPoints.forEach(p => {
    const gx = Math.floor(p.lat / cellSizeDeg);
    const gy = Math.floor(p.lng / cellSizeDeg);
    const key = `${gx}:${gy}`;
    grid[key] = (grid[key] || 0) + (p.intensity || 1);
  });
  const clusters = Object.entries(grid)
    .filter(([_, count]) => count >= threshold)
    .map(([key, count]) => {
      const [gx, gy] = key.split(":").map(Number);
      return { lat: (gx + 0.5) * cellSizeDeg, lng: (gy + 0.5) * cellSizeDeg, count };
    });
  return clusters;
}

function forecastNextWeek(currentBy: Record<string, number>, previousBy: Record<string, number>) {
  const keys = new Set([...Object.keys(currentBy), ...Object.keys(previousBy)]);
  const forecast: { key: string; predictedCount: number; changePct: number }[] = [];
  keys.forEach(k => {
    const cur = currentBy[k] || 0;
    const prev = previousBy[k] || 0;
    const pred = Math.round((cur + prev) / 2);
    const changePct = prev ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
    if(cur > 0 || prev > 0) { // Only include if there's some activity
      forecast.push({ key: k, predictedCount: pred, changePct: Math.round(changePct*10)/10 });
    }
  });
  forecast.sort((a,b) => b.predictedCount - a.predictedCount);
  return forecast;
}

// #endregion

const GenerateReportInputSchema = z.object({
  type: z.enum(['Weekly', 'Monthly', 'Custom']),
});

export const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: z.any(), // Allow any for the full document return
  },
  async ({ type }) => {
    const days = type === "Weekly" ? 7 : type === "Monthly" ? 30 : 3;
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);

    const currentIncidents = await fetchIncidentDataForAI({ startDate: currentStart, endDate: now });
    const previousIncidents = await fetchIncidentDataForAI({ startDate: previousStart, endDate: currentStart });

    if (!currentIncidents.length) throw new Error("No incidents found in the current period.");

    const curAgg = aggregateIncidents(currentIncidents);
    const prevAgg = aggregateIncidents(previousIncidents);
    
    // Anomaly Detection
    const anomalyAnalysis: any = {
      totalChange: currentIncidents.length - previousIncidents.length,
      avgDurationChange: curAgg.avgDuration - prevAgg.avgDuration,
      categorySpikes: [],
      locationSpikes: [],
    };
    
    Object.keys(curAgg.byCategory).forEach(cat => {
        const curCount = curAgg.byCategory[cat];
        const prevCount = prevAgg.byCategory[cat] || 0;
        const diff = curCount - prevCount;
        if(diff === 0 && curCount === 0) return;
        const pct = prevCount ? ((diff / prevCount) * 100) : 100;
        if (Math.abs(diff) >= 2 || Math.abs(pct) >= 20) {
            anomalyAnalysis.categorySpikes.push({ category: cat, change: diff, percent: pct.toFixed(1) });
        }
    });

    // Geospatial and Predictive Analysis
    const heatmap = curAgg.heatPoints;
    const hotspots = computeHotspots(heatmap, 0.02, 3);
    const catForecast = forecastNextWeek(curAgg.byCategory, prevAgg.byCategory);
    const locForecast = forecastNextWeek(curAgg.byLocationLabel, prevAgg.byLocationLabel);
    const subForecast = forecastNextWeek(curAgg.bySubcategory, prevAgg.bySubcategory);

    const chartData = {
        byCategory: Object.entries(curAgg.byCategory).map(([name, count]) => ({ name, count })),
        bySubcategory: Object.entries(curAgg.bySubcategory).map(([name, count]) => ({ name, count })),
        byLocation: Object.entries(curAgg.byLocationLabel).map(([name, count]) => ({ name, count })),
        dailyActivity: Object.entries(curAgg.daily).map(([date, count]) => ({ date, count })),
    };
    
    const topCats = catForecast.slice(0,5).map(x => `${x.key} (pred ${x.predictedCount}, Δ${x.changePct}%)`).join(", ");
    const topLocs = locForecast.slice(0,5).map(x => `${x.key} (pred ${x.predictedCount}, Δ${x.changePct}%)`).join(", ");

    const summaryPrompt = `
      You are an analytical assistant for Local Focus. Create a ${type} Incident Report.
      Analyze the data to provide a structured summary with clear bullet points and a short action plan.
      - Current window: ${currentStart.toDateString()} → ${now.toDateString()}
      - Totals: ${currentIncidents.length} incidents
      - Avg duration: ${curAgg.avgDuration.toFixed(1)}h
      - Top predicted categories next week: ${topCats || "N/A"}
      - Top predicted locations next week: ${topLocs || "N/A"}
      - Hotspots (approx centers): 
      ${hotspots.map(h => `• lat ${h.lat.toFixed(4)}, lng ${h.lng.toFixed(4)} (count ${h.count})`).join("\n") || "None"}
    `;

    const { text } = await ai.generate({ prompt: summaryPrompt });
    const summaryText = text || 'No AI summary generated.';

    const reportTitle = `${type} AI Incident Report (${currentStart.toLocaleDateString()} – ${now.toLocaleDateString()})`;

    const reportDoc = {
      title: reportTitle,
      type,
      organizationId: "LOCAL_FOCUS_ORG_ID",
      createdAt: serverTimestamp(),
      summary: summaryText,
      totals: {
        current: currentIncidents.length,
        previous: previousIncidents.length,
        avgDurationHours: curAgg.avgDuration
      },
      geo: {
        heatmap,
        hotspots,
      },
      charts: chartData,
      forecasts: {
        categories: catForecast,
        locations: locForecast,
        subcategories: subForecast
      },
      anomalyAnalysis: anomalyAnalysis,
    };

    const docRef = await addDoc(collection(db, "ai_reports"), reportDoc);

    return { id: docRef.id, ...reportDoc };
  }
);

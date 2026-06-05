import { AnalyticsClient } from "@/components/analytics/analytics-client";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">גרפים וניתוח</h1>
        <p className="text-sm text-slate-500">
          סננו את ההוצאות לפי כל חתך, בחרו סוג גרף, והסיקו מסקנות במהירות.
        </p>
      </header>
      <AnalyticsClient />
    </div>
  );
}

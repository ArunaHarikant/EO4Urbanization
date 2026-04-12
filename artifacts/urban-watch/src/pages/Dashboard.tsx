import { useGetAnalysisSummary, useGetUrbanStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Activity, Trees, Droplet, MountainSnow } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetAnalysisSummary();
  const { data: stats, isLoading: loadingStats } = useGetUrbanStats({ granularity: "monthly" });

  const landUseData = summary ? [
    { name: "Urban", value: summary.landUseSummary.urbanPercent, color: "hsl(var(--primary))" },
    { name: "Vegetation", value: summary.landUseSummary.vegetationPercent, color: "hsl(var(--chart-3))" },
    { name: "Water", value: summary.landUseSummary.waterPercent, color: "hsl(var(--chart-2))" },
    { name: "Bare Land", value: summary.landUseSummary.bareLandPercent, color: "hsl(var(--chart-4))" },
  ] : [];

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full">
      <div>
        <h1 className="text-3xl font-bold uppercase tracking-tight">Urban Growth Dashboard</h1>
        <p className="text-muted-foreground mt-2">Global metrics and analysis overview.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Urban Area", value: summary?.totalUrbanAreaKm2 ? `${summary.totalUrbanAreaKm2.toLocaleString()} km²` : "-", icon: Map, color: "text-primary" },
          { title: "Annual Growth", value: summary?.annualGrowthRatePercent ? `${summary.annualGrowthRatePercent.toFixed(1)}%` : "-", icon: Activity, color: "text-chart-4" },
          { title: "Recent Growth (30d)", value: summary?.recentGrowthKm2 ? `+${summary.recentGrowthKm2.toLocaleString()} km²` : "-", icon: Activity, color: "text-chart-5" },
          { title: "Active Regions", value: summary?.activeRegionsCount || "-", icon: Map, color: "text-chart-2" },
        ].map((stat, i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                {loadingSummary ? <Skeleton className="h-8 w-24 mt-2" /> : <p className="text-3xl font-bold mt-2">{stat.value}</p>}
              </div>
              <stat.icon className={`h-8 w-8 opacity-50 ${stat.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="col-span-1 lg:col-span-2 bg-card">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider text-sm text-muted-foreground">Area Progression (km²)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {loadingStats ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', year: '2-digit'})} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                  />
                  <Area type="monotone" dataKey="urbanAreaKm2" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} name="Urban" />
                  <Area type="monotone" dataKey="vegetationAreaKm2" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.4} name="Vegetation" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider text-sm text-muted-foreground">Land Use Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center">
            {loadingSummary ? (
              <Skeleton className="h-[200px] w-[200px] rounded-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={landUseData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                      {landUseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))" }}
                      formatter={(val: number) => [`${val.toFixed(1)}%`, "Coverage"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4 w-full">
                  {landUseData.map(item => (
                    <div key={item.name} className="flex items-center text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
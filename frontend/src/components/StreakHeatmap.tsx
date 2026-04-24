import { motion } from "framer-motion";
import { useMemo } from "react";

const getGreenColor = (val: number) => {
  if (val === 0) return "bg-muted/30"; // Base color
  if (val < 0.25) return "bg-[#0e4429]";
  if (val < 0.50) return "bg-[#006d32]";
  if (val < 0.75) return "bg-[#26a641]";
  return "bg-[#39d353]";
};

const StreakHeatmap = ({ weeks = 52, activityMap = {}, isRandom = false }: { weeks?: number, activityMap?: Record<string, number>, isRandom?: boolean }) => {
  // Generate 52 weeks of dates ending today
  const heatmapData = useMemo(() => {
    const today = new Date();
    const days = weeks * 7;
    const data = [];
    
    // We want the last day to be today, so we go back (days - 1)
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      
      const dateStr = d.toISOString().split('T')[0];
      
      let count = 0;
      if (isRandom) {
        count = Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 0;
      } else {
        count = activityMap[dateStr] || 0;
      }
      
      // We normalize the value. Let's assume max 15 contributions for deep green.
      const val = Math.min(count / 15, 1);
      
      data.push({
        date: d,
        val: val,
        count: count
      });
    }
    return data;
  }, [weeks, activityMap, isRandom]);

  // Extract month labels logic
  const monthLabels = useMemo(() => {
    const labels: { label: string, colIndex: number }[] = [];
    let currentMonth = -1;
    
    for (let w = 0; w < weeks; w++) {
      const firstDayOfWeek = heatmapData[w * 7];
      if (firstDayOfWeek && firstDayOfWeek.date.getMonth() !== currentMonth) {
        currentMonth = firstDayOfWeek.date.getMonth();
        // Avoid squishing labels if they are too close to the start
        if (w > 0 || (w === 0 && firstDayOfWeek.date.getDate() < 15)) {
            labels.push({ 
                label: firstDayOfWeek.date.toLocaleString('default', { month: 'short' }), 
                colIndex: w 
            });
        }
      }
    }
    return labels;
  }, [heatmapData, weeks]);

  return (
    <div className="w-full overflow-x-hidden">
      <div className="flex flex-col min-w-max pb-2">
        {/* Month Labels */}
        <div className="flex relative h-5 text-xs text-muted-foreground mb-1">
            {monthLabels.map((m, i) => (
                <div 
                    key={i} 
                    className="absolute"
                    style={{ left: `${m.colIndex * 15}px` }} // 12px width + 3px gap = 15px per col
                >
                    {m.label}
                </div>
            ))}
        </div>
        
        {/* Heatmap Grid */}
        <div className="flex gap-[3px]">
          {Array.from({ length: weeks }, (_, w) => (
            <div key={w} className="flex flex-col gap-[3px] w-[12px]">
              {Array.from({ length: 7 }, (_, d) => {
                const dayData = heatmapData[w * 7 + d];
                if (!dayData) return null;
                
                const dateStr = dayData.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const titleStr = dayData.count === 0 
                  ? `No contributions on ${dateStr}`
                  : `${dayData.count} contributions on ${dateStr}`;
                  
                return (
                  <motion.div
                    key={d}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (w * 7 + d) * 0.001, duration: 0.1 }}
                    className={`w-3 h-3 rounded-sm ${getGreenColor(dayData.val)} hover:ring-1 hover:ring-foreground/50 transition-all cursor-pointer`}
                    title={titleStr}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-muted/30" />
        <div className="w-3 h-3 rounded-sm bg-[#0e4429]" />
        <div className="w-3 h-3 rounded-sm bg-[#006d32]" />
        <div className="w-3 h-3 rounded-sm bg-[#26a641]" />
        <div className="w-3 h-3 rounded-sm bg-[#39d353]" />
        <span>More</span>
      </div>
    </div>
  );
};

export default StreakHeatmap;

import { db, pool } from "./src/index.js";
import { aoiTable } from "./src/schema/aoi.js";
import { urbanStatsTable } from "./src/schema/stats.js";

async function seed() {
  console.log("Seeding database...");
  
  const regions = [
    { name: "São Paulo, Brazil", latitude: -23.5505, longitude: -46.6333, areaKm2: 1521, bounds: "{}" },
    { name: "Lagos, Nigeria", latitude: -6.5244, longitude: 3.3792, areaKm2: 1171, bounds: "{}" },
    { name: "Kuala Lumpur, Nigeria", latitude: 3.1390, longitude: 101.6869, areaKm2: 243, bounds: "{}" }
  ];
  
  for (const region of regions) {
    const [insertedAoi] = await db.insert(aoiTable).values(region).returning();
    
    // Create random mock stats for this region
    let baseUrban = 100 + Math.random() * 50;
    
    for (let month = 1; month <= 12; month++) {
      const date = new Date(`2023-${month.toString().padStart(2, '0')}-01T00:00:00Z`);
      const growth = Math.random() * 5;
      baseUrban += growth;
      
      await db.insert(urbanStatsTable).values({
        aoiId: insertedAoi.id,
        date: date.toISOString(),
        urbanAreaKm2: baseUrban.toString(),
        vegetationAreaKm2: (400 - baseUrban).toString(),
        waterAreaKm2: "50",
        bareLandAreaKm2: "20",
        growthRatePercent: ((growth / baseUrban) * 100).toString(),
      });
    }
  }
  
  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch(console.error);
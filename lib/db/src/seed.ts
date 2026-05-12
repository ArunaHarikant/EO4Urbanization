import { db, pool } from "./index";
import { areasOfInterestTable } from "./schema/aoi";
import { urbanStatsTable } from "./schema/stats";

async function seed() {
  console.log("Seeding database...");
  
  const regions = [
    { name: "São Paulo, Brazil", minLat: -24.0, maxLat: -23.0, minLon: -47.0, maxLon: -46.0, areaKm2: 1521 },
    { name: "Lagos, Nigeria", minLat: 6.0, maxLat: 7.0, minLon: 3.0, maxLon: 4.0, areaKm2: 1171 },
    { name: "Kuala Lumpur, Malaysia", minLat: 2.5, maxLat: 3.5, minLon: 101.0, maxLon: 102.0, areaKm2: 243 }
  ];
  
  for (const region of regions) {
    const [insertedAoi] = await db.insert(areasOfInterestTable).values(region).returning();
    
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
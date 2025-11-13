const fs = require("fs");

// Read the refactored eco.json
const data = JSON.parse(
  fs.readFileSync("../eco_trails_icp_frontend/eco.json", "utf8"),
);
const trails = data.eco_trails;

console.log(`Found ${trails.length} trails to convert`);

// Convert to Motoko format
let motokoCode = `    // Initialize all ${trails.length} trails from eco.json
    private func initializeAllTrails() {
        // Clear existing trails
        for ((id, _) in trailMap.entries()) {
            trailMap.delete(id);
        };
        
        // Add all trails from eco.json
`;

trails.forEach((trail, index) => {
  // Convert coordinates
  const lat = parseFloat(trail.location.coordinates.latitude);
  const lng = parseFloat(trail.location.coordinates.longitude);

  // Escape quotes in text
  const escape = (text) => text.replace(/"/g, '\\"').replace(/\n/g, "\\n");

  // Build keywords array
  const keywords = trail.location.keywords
    .map((k) => `"${escape(k)}"`)
    .join("; ");

  // Build best_season array
  const seasons = trail.best_season.map((s) => `"${escape(s)}"`).join("; ");

  motokoCode += `        let trail${trail.id}: TrailRecord = {
            id = ${trail.id};
            name = "${escape(trail.name)}";
            description = "${escape(trail.description)}";
            location = {
                region = "${escape(trail.location.region)}";
                keywords = [${keywords}];
                coordinates = {
                    lat = ${lat};
                    lng = ${lng};
                };
            };
            trail_details = {
                difficulty = "${escape(trail.trail_details.difficulty)}";
                duration = "${escape(trail.trail_details.duration)}";
                length = "${escape(trail.trail_details.length_km)} км";
                elevation = "неизвестна";
            };
            best_season = [${seasons}];
        };
        trailMap.put(trail${trail.id}.id, trail${trail.id});

`;
});

motokoCode += `        nextTrailId := ${trails.length + 1};
        Debug.print("✅ Initialized " # Nat.toText(trailMap.size()) # " trails from eco.json");
    };`;

// Write to file
fs.writeFileSync("trails_motoko.mo", motokoCode);

console.log("✅ Generated Motoko code for all trails!");
console.log("📁 Saved to: trails_motoko.mo");
console.log(`📊 Total trails: ${trails.length}`);

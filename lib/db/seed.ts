import { db, rejectionTaxonomies } from "./index";
import { REJECTION_TAXONOMY_SEEDS } from "../config";

export async function seedRejectionTaxonomies() {
  console.log("Seeding rejection taxonomies...");

  for (const item of REJECTION_TAXONOMY_SEEDS) {
    await db
      .insert(rejectionTaxonomies)
      .values({
        code: item.code,
        label: item.label,
        description: item.description,
      })
      .onConflictDoNothing({ target: rejectionTaxonomies.code });
  }

  console.log("Rejection taxonomies seeded successfully.");
}

// Allow direct CLI execution if executed with tsx / node
if (process.argv[1]?.includes("seed.ts")) {
  seedRejectionTaxonomies()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}


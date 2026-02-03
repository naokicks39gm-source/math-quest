import e1 from "@/content/grades/mathquest_e1_types_v1.json";
import e2 from "@/content/grades/mathquest_e2_types_v1.json";
import e3 from "@/content/grades/mathquest_e3_types_v1.json";
import e4 from "@/content/grades/mathquest_e4_types_v1.json";
import e5 from "@/content/grades/mathquest_e5_types_v1.json";
import e6 from "@/content/grades/mathquest_e6_types_v1.json";
import h1 from "@/content/grades/mathquest_h1_types_v1.json";
import h2 from "@/content/grades/mathquest_h2_types_v1.json";
import h3 from "@/content/grades/mathquest_h3_types_v1.json";
import j1 from "@/content/grades/mathquest_j1_types_v1.json";
import j2 from "@/content/grades/mathquest_j2_types_v1.json";
import j3 from "@/content/grades/mathquest_j3_types_v1.json";

const chunks = [e1, e2, e3, e4, e5, e6, j1, j2, j3, h1, h2, h3];

const merged = {
  version: "v2",
  generated_at: chunks[0]?.generated_at ?? "",
  notes: ["Merged from split grade JSON files in src/content/grades/."],
  grades: chunks.flatMap((chunk) => chunk.grades ?? [])
};

export default merged;

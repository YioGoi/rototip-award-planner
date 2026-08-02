import caseStudyData from "../../data/case-study.json";
import { validateDatasetIntegrity } from "@/domain/dataset-integrity";
import { caseStudySchema } from "@/domain/schemas";

export function validateCaseStudy(input: unknown) {
  const schemaResult = caseStudySchema.safeParse(input);

  if (!schemaResult.success) {
    return {
      success: false as const,
      stage: "schema" as const,
      issues: schemaResult.error.issues,
    };
  }

  const integrityResult = validateDatasetIntegrity(schemaResult.data);

  if (!integrityResult.valid) {
    return {
      success: false as const,
      stage: "integrity" as const,
      issues: integrityResult.issues,
    };
  }

  return {
    success: true as const,
    data: schemaResult.data,
  };
}

export function loadCaseStudy() {
  return validateCaseStudy(caseStudyData);
}

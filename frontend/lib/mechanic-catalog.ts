import type {
  ConceptFamily,
  MechanicFamily,
} from "./kindergarten-curriculum";

export interface MechanicDefinition {
  id: MechanicFamily;
  name: string;
  description: string;
  supportsConcepts: ConceptFamily[];
  studentSafe: true;
}

export const MECHANIC_CATALOG: Record<MechanicFamily, MechanicDefinition> = {
  count_and_compare: {
    id: "count_and_compare",
    name: "Count and Compare",
    description:
      "Count items in one or more groups, then compare which has more, fewer, or equal.",
    supportsConcepts: [
      "addition_subtraction_20",
      "even_odd_arrays_equal_groups",
      "addition_subtraction_100",
      "place_value_to_1000",
      "compare_to_1000",
      "addition_subtraction_1000",
      "money_and_data",
      "length_and_measurement",
      "time_shapes_fractions_equal_parts",
    ],
    studentSafe: true,
  },
  sort_and_match: {
    id: "sort_and_match",
    name: "Sort and Match",
    description:
      "Sort items into meaningful buckets and match visuals to simple labels.",
    supportsConcepts: [
      "habitats_and_survival",
      "characters_and_challenges",
      "government_and_community",
      "point_of_view",
      "technology_problem_solving",
      "stories_and_lessons",
      "past_and_present",
      "buyers_and_sellers",
      "friends_and_family",
      "animal_discoveries",
      "learning_from_experiences",
      "community_difference",
      "changes_over_time",
      "teamwork",
      "money_and_data",
      "time_shapes_fractions_equal_parts",
      "ecosystems_pollination_seed_dispersal",
    ],
    studentSafe: true,
  },
  predict_and_test: {
    id: "predict_and_test",
    name: "Predict and Test",
    description:
      "Make a simple prediction, test with a mini simulation, and reflect on what happened.",
    supportsConcepts: [
      "earth_systems_wind_water",
      "states_of_matter",
      "technology_problem_solving",
      "government_and_community",
      "community_difference",
      "changes_over_time",
      "length_and_measurement",
      "addition_subtraction_100",
      "addition_subtraction_1000",
      "ecosystems_pollination_seed_dispersal",
    ],
    studentSafe: true,
  },
};

export const MECHANIC_ORDER: MechanicFamily[] = [
  "sort_and_match",
  "count_and_compare",
  "predict_and_test",
];

export function getAllowedMechanicsForConcept(
  conceptFamily: ConceptFamily
): MechanicFamily[] {
  return MECHANIC_ORDER.filter((mechanicId) =>
    MECHANIC_CATALOG[mechanicId].supportsConcepts.includes(conceptFamily)
  );
}

export function getAlternateMechanic(
  currentMechanic: MechanicFamily,
  conceptFamily: ConceptFamily
): MechanicFamily {
  const allowed = getAllowedMechanicsForConcept(conceptFamily);
  if (allowed.length === 0) {
    return currentMechanic;
  }
  const next = allowed.find((mechanic) => mechanic !== currentMechanic);
  return next ?? currentMechanic;
}

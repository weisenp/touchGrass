export type PlantChoice = {
  key: string;
  name: string;
  icon: string;
};

export const PLANT_OPTIONS: PlantChoice[] = [
  { key: "fern", name: "Fern", icon: "🌿" },
  { key: "cactus", name: "Cactus", icon: "🌵" },
  { key: "blossom", name: "Blossom", icon: "🌸" },
];

export function getPlantChoice(key: string | null | undefined) {
  return PLANT_OPTIONS.find((plant) => plant.key === key) ?? PLANT_OPTIONS[0];
}

export function plantChoiceStorageKey(userId: string) {
  return `touchgrass:plant-choice:${userId}`;
}

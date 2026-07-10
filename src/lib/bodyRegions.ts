/** Human-readable labels for normalized body region codes (US catalog). */

const BODY_REGION_DISPLAY: Record<string, string> = {
  shoulder_right: "Right Shoulder",
  shoulder_left: "Left Shoulder",
  elbow_right: "Right Elbow",
  elbow_left: "Left Elbow",
  wrist_right: "Right Wrist",
  wrist_left: "Left Wrist",
  hand_right: "Right Hand",
  hand_left: "Left Hand",
  hip_right: "Right Hip",
  hip_left: "Left Hip",
  knee_right: "Right Knee",
  knee_left: "Left Knee",
  ankle_right: "Right Ankle",
  ankle_left: "Left Ankle",
  foot_right: "Right Foot",
  foot_left: "Left Foot",
  spine_cervical: "Cervical Spine",
  spine_thoracic: "Thoracic Spine",
  spine_lumbar: "Lumbar Spine",
  spine_sacral: "Sacral Spine",
  pelvis: "Pelvis",
  pelvis_right: "Right Si Joint",
  pelvis_left: "Left Si Joint",
};

export function displayBodyRegion(code?: string | null): string | null {
  if (!code) return null;
  return BODY_REGION_DISPLAY[code] ?? code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function groupEntitiesByRegion<T extends { region?: string; displayRegion?: string }>(
  entities: T[]
): { regionKey: string; label: string; items: T[] }[] {
  const groups = new Map<string, { label: string; items: T[] }>();
  for (const entity of entities) {
    const key = entity.region || "__unassigned__";
    const label =
      entity.displayRegion || displayBodyRegion(entity.region) || "Other findings";
    const bucket = groups.get(key);
    if (bucket) {
      bucket.items.push(entity);
    } else {
      groups.set(key, { label, items: [entity] });
    }
  }
  return Array.from(groups.entries()).map(([regionKey, { label, items }]) => ({
    regionKey,
    label,
    items,
  }));
}

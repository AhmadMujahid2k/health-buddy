export type Meal = "breakfast" | "lunch" | "dinner" | "snack" | "drink";
export const MEALS: Meal[] = ["breakfast", "lunch", "snack", "dinner", "drink"];

export interface Profile {
  name: string | null;
  sex: "male" | "female";
  dob: string;
  height_cm: number;
  start_date: string;
  start_weight: number;
  goal_weight: number;
  activity_factor: number;
  kcal_target: number;
  kcal_floor: number;
  protein_target: number;
  step_target: number;
  water_target: number;
  sleep_target: number;
  milestone_weight: number | null;
  milestone_date: string | null;
  milestone_label: string | null;
  claude_model: string;
  voice_language: string;
  /** everyday steps already covered by BMR x activity_factor */
  base_steps: number;
  /** free text sent to Claude with every estimate: cuisine, cooking oil, usual recipes */
  food_context: string | null;
}

export interface DayRow {
  date: string;
  weight: number | null;
  steps: number | null;
  active_kcal: number | null;
  water_l: number | null;
  sleep_h: number | null;
  notes: string | null;
}

export interface Food {
  id: number;
  name: string;
  aliases: string;
  unit: string;
  kcal: number;
  protein: number;
  note: string | null;
  source: "seed" | "claude" | "user";
  uses: number;
}

/** A parsed line shown in the preview before saving. Totals already include qty. */
export interface DraftItem {
  name: string;
  qty: number;
  unit: string;
  kcal: number;
  protein: number;
  food_id: number | null;
  estimated_by: "table" | "claude" | "manual";
  text: string; // the chunk of the message this came from
}

export interface EntryItem extends DraftItem {
  id: number;
  entry_id: number;
}

export interface Entry {
  id: number;
  date: string;
  meal: Meal;
  raw_text: string | null;
  source: string;
  created_at: string;
  items: EntryItem[];
}

/** Everything computed for one day. */
export interface DayStats {
  date: string;
  dayNo: number;
  weight: number | null; // measured that day
  weightUsed: number; // latest weigh-in on or before this day
  intake: number;
  protein: number;
  steps: number | null;
  activeKcal: number; // what the watch reported for the whole day
  activeCounted: number; // the part above everyday movement, added to the burn
  bmr: number;
  baseBurn: number;
  totalBurn: number;
  deficit: number; // 0 when no food logged yet
  cumDeficit: number;
  fatKg: number;
  goalPath: number | null; // planned weight on the straight line to the milestone
  water: number | null;
  sleep: number | null;
  logged: boolean;
}

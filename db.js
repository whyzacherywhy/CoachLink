import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const __dirname = dirname(fileURLToPath(import.meta.url));

export const hasDatabase = Boolean(databaseUrl);

const pool = hasDatabase
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
    })
  : null;

export async function initDatabase() {
  if (!pool) return;
  const schema = await readFile(join(__dirname, "db", "schema.sql"), "utf8");
  await pool.query(schema);
  await ensureDefaultCoach();
}

async function query(text, params = []) {
  if (!pool) throw new Error("Database is not configured.");
  return pool.query(text, params);
}

async function transaction(callback) {
  if (!pool) throw new Error("Database is not configured.");
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function msDate(value) {
  if (!value) return null;
  return new Date(value).getTime();
}

function isoDate(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function intOrNull(value) {
  return Number.isFinite(value) ? Math.round(value) : null;
}

function mapProfile(row, runs = []) {
  return {
    id: row.id,
    name: row.name,
    age: row.age || "",
    location: row.location || "",
    goals: row.goals || "",
    coachNotes: row.coach_notes || "",
    photo: row.photo_url || "",
    createdAt: msDate(row.created_at),
    updatedAt: msDate(row.updated_at),
    runs,
  };
}

function mapRunSummary(row) {
  return {
    id: row.id,
    title: row.title,
    dateLabel: row.date_label,
    startedAt: msDate(row.started_at),
    endedAt: msDate(row.ended_at),
    distanceMiles: Number(row.distance_miles || 0),
    elapsedSeconds: Number(row.elapsed_seconds || 0),
    averagePace: Number(row.average_pace || 0),
    elevationGainFeet: Number(row.elevation_gain_feet || 0),
    elevationLossFeet: Number(row.elevation_loss_feet || 0),
    weather: row.weather || {},
    notes: row.notes || "",
    savedAt: msDate(row.created_at),
  };
}

function mapRun(row) {
  return {
    ...mapRunSummary(row),
    runnerName: row.runner_name || "Runner",
    mileSplits: [],
    coachSplits: [],
    route: [],
    history: [],
  };
}

async function ensureDefaultCoach() {
  const email = process.env.COACH_EMAIL || "coach@coachlink.local";
  const displayName = process.env.COACH_NAME || "Coach";
  await query(
    `insert into coaches (email, display_name)
     values ($1, $2)
     on conflict (email) do update set display_name = excluded.display_name, updated_at = now()`,
    [email, displayName],
  );
}

async function defaultCoachId(client = { query }) {
  const email = process.env.COACH_EMAIL || "coach@coachlink.local";
  const result = await client.query("select id from coaches where email = $1 limit 1", [email]);
  return result.rows[0]?.id;
}

export async function listProfiles() {
  const coachId = await defaultCoachId();
  const profiles = await query(
    `select *
     from runner_profiles
     where coach_id = $1
     order by updated_at desc, created_at desc`,
    [coachId],
  );
  const runs = await query(
    `select re.*
     from run_entries re
     join runner_profiles rp on rp.id = re.profile_id
     where rp.coach_id = $1
     order by re.started_at desc`,
    [coachId],
  );
  const runsByProfile = new Map();
  for (const run of runs.rows) {
    if (!runsByProfile.has(run.profile_id)) runsByProfile.set(run.profile_id, []);
    runsByProfile.get(run.profile_id).push(mapRunSummary(run));
  }
  return profiles.rows.map((profile) => mapProfile(profile, runsByProfile.get(profile.id) || []));
}

export async function createProfile({ name }) {
  const coachId = await defaultCoachId();
  const result = await query(
    `insert into runner_profiles (coach_id, name)
     values ($1, $2)
     returning *`,
    [coachId, name || "Runner"],
  );
  return mapProfile(result.rows[0], []);
}

export async function getProfile(profileId) {
  const profileResult = await query("select * from runner_profiles where id = $1", [profileId]);
  const profile = profileResult.rows[0];
  if (!profile) return null;
  const runsResult = await query(
    `select * from run_entries
     where profile_id = $1
     order by started_at desc, created_at desc`,
    [profileId],
  );
  return mapProfile(profile, runsResult.rows.map(mapRunSummary));
}

export async function updateProfile(profileId, updates) {
  const result = await query(
    `update runner_profiles
     set name = coalesce($2, name),
         age = coalesce($3, age),
         location = coalesce($4, location),
         goals = coalesce($5, goals),
         coach_notes = coalesce($6, coach_notes),
         photo_url = coalesce($7, photo_url),
         updated_at = now()
     where id = $1
     returning *`,
    [
      profileId,
      updates.name ?? null,
      updates.age ?? null,
      updates.location ?? null,
      updates.goals ?? null,
      updates.coachNotes ?? null,
      updates.photo ?? null,
    ],
  );
  if (!result.rows[0]) return null;
  const profile = await getProfile(profileId);
  return profile;
}

export async function getRun(profileId, runId) {
  const result = await query("select * from run_entries where profile_id = $1 and id = $2", [
    profileId,
    runId,
  ]);
  const row = result.rows[0];
  if (!row) return null;
  const run = mapRun(row);

  const [route, miles, coachSplits, history] = await Promise.all([
    query("select * from run_route_points where run_id = $1 order by point_index", [runId]),
    query("select * from run_mile_splits where run_id = $1 order by mile_number", [runId]),
    query("select * from run_coach_splits where run_id = $1 order by split_number", [runId]),
    query("select * from run_history_items where run_id = $1 order by happened_at, id", [runId]),
  ]);

  run.route = route.rows.map((point) => ({
    lat: Number(point.lat),
    lng: Number(point.lng),
    altitude: point.altitude === null ? null : Number(point.altitude),
    at: msDate(point.recorded_at),
  }));
  run.mileSplits = miles.rows.map((mile) => ({
    number: mile.mile_number,
    label: mile.label || `Mile ${mile.mile_number}`,
    distanceMiles: Number(mile.distance_miles || 1),
    isPartial: Boolean(mile.is_partial),
    endedAt: msDate(mile.ended_at),
    seconds: Number(mile.seconds || 0),
    pace: Number(mile.pace || 0),
    elevationFeet: mile.elevation_feet,
  }));
  run.coachSplits = coachSplits.rows.map((split) => ({
    number: split.split_number,
    startedAt: msDate(split.started_at),
    endedAt: msDate(split.ended_at),
    elapsedSeconds: Number(split.elapsed_seconds || 0),
    distanceMeters: Number(split.distance_meters || 0),
    distanceMiles: Number(split.distance_miles || 0),
    pace: Number(split.pace || 0),
    elevationFeet: split.elevation_feet,
  }));
  run.history = history.rows.map((item) => ({
    at: msDate(item.happened_at),
    type: item.item_type,
    text: item.text,
  }));
  return run;
}

export async function saveRun(profileId, run) {
  return transaction(async (client) => {
    const inserted = await client.query(
      `insert into run_entries (
         profile_id, title, date_label, started_at, ended_at, distance_miles,
         elapsed_seconds, average_pace, elevation_gain_feet, elevation_loss_feet,
         weather, notes
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning *`,
      [
        profileId,
        run.title,
        run.dateLabel,
        isoDate(run.startedAt),
        isoDate(run.endedAt),
        run.distanceMiles || 0,
        Math.round(run.elapsedSeconds || 0),
        run.averagePace || 0,
        Math.round(run.elevationGainFeet || 0),
        Math.round(run.elevationLossFeet || 0),
        JSON.stringify(run.weather || {}),
        run.notes || "",
      ],
    );
    const saved = inserted.rows[0];

    for (const [index, point] of (run.route || []).entries()) {
      await client.query(
        `insert into run_route_points (run_id, point_index, lat, lng, altitude, recorded_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [saved.id, index, point.lat, point.lng, point.altitude ?? null, isoDate(point.at)],
      );
    }

    for (const mile of run.mileSplits || []) {
      await client.query(
        `insert into run_mile_splits (
           run_id, mile_number, label, distance_miles, is_partial, ended_at,
           seconds, pace, elevation_feet
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          saved.id,
          mile.number,
          mile.label || `Mile ${mile.number}`,
          mile.distanceMiles || 1,
          Boolean(mile.isPartial),
          isoDate(mile.endedAt),
          Math.round(mile.seconds || 0),
          mile.pace || 0,
          intOrNull(mile.elevationFeet),
        ],
      );
    }

    for (const split of run.coachSplits || []) {
      await client.query(
        `insert into run_coach_splits (
           run_id, split_number, started_at, ended_at, elapsed_seconds,
           distance_meters, distance_miles, pace, elevation_feet
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          saved.id,
          split.number,
          isoDate(split.startedAt),
          isoDate(split.endedAt),
          Math.round(split.elapsedSeconds || 0),
          split.distanceMeters || 0,
          split.distanceMiles || 0,
          split.pace || 0,
          intOrNull(split.elevationFeet),
        ],
      );
    }

    for (const item of run.history || []) {
      await client.query(
        `insert into run_history_items (run_id, happened_at, item_type, text)
         values ($1, $2, $3, $4)`,
        [saved.id, isoDate(item.at), item.type || "note", item.text || ""],
      );
    }

    await client.query("update runner_profiles set updated_at = now() where id = $1", [profileId]);
    return mapRunSummary(saved);
  });
}

export async function updateRunNotes(profileId, runId, notes) {
  const result = await query(
    `update run_entries
     set notes = $3, updated_at = now()
     where profile_id = $1 and id = $2
     returning *`,
    [profileId, runId, notes || ""],
  );
  return result.rows[0] ? mapRunSummary(result.rows[0]) : null;
}

export async function deleteRun(profileId, runId) {
  const result = await query(
    `delete from run_entries
     where profile_id = $1 and id = $2
     returning id`,
    [profileId, runId],
  );
  if (!result.rows[0]) return false;
  await query("update runner_profiles set updated_at = now() where id = $1", [profileId]);
  return true;
}

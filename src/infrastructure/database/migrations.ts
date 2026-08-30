import { Database } from "./types";

export const LATEST_DATABASE_VERSION = 13;

export const migrations: ReadonlyArray<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE shooter_profiles (
        id TEXT PRIMARY KEY NOT NULL,
        display_name TEXT NOT NULL CHECK(length(trim(display_name)) >= 2),
        laterality TEXT NOT NULL CHECK(laterality IN ('right', 'left')),
        declared_level TEXT NOT NULL CHECK(declared_level IN ('beginner', 'intermediate', 'advanced')),
        primary_weapon TEXT NOT NULL CHECK(primary_weapon IN ('glock-19', 'glock-48', 'glock-43x')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE app_settings (
        singleton_key INTEGER PRIMARY KEY NOT NULL CHECK(singleton_key = 1),
        active_profile_id TEXT NULL,
        FOREIGN KEY(active_profile_id) REFERENCES shooter_profiles(id) ON DELETE SET NULL
      );

      INSERT INTO app_settings(singleton_key, active_profile_id) VALUES (1, NULL);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE weapons (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
      );

      INSERT INTO weapons(id, name, active) VALUES
        ('glock-19', 'Glock 19', 1),
        ('glock-48', 'Glock 48', 1),
        ('glock-43x', 'Glock 43X', 1);

      CREATE TABLE target_types (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
        width_mm INTEGER NULL CHECK(width_mm IS NULL OR width_mm > 0),
        height_mm INTEGER NULL CHECK(height_mm IS NULL OR height_mm > 0)
      );

      INSERT INTO target_types(id, name, active, width_mm, height_mm) VALUES
        ('generic-centered', 'Cible générique centrée', 1, NULL, NULL),
        ('fftir', 'Cible FFTir', 1, NULL, NULL),
        ('other-paper', 'Autre cible papier', 1, NULL, NULL);

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY NOT NULL,
        shooter_profile_id TEXT NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('coaching_free', 'training')),
        status TEXT NOT NULL CHECK(status IN ('draft', 'active', 'completed', 'cancelled')),
        weapon_id TEXT NOT NULL,
        distance_mm INTEGER NOT NULL CHECK(distance_mm BETWEEN 1000 AND 100000),
        target_type_id TEXT NOT NULL,
        objective_type TEXT NULL CHECK(objective_type IS NULL OR objective_type IN ('free_text', 'provisional_skill')),
        objective_label TEXT NULL,
        selected_skill_id TEXT NULL,
        shooter_display_name_snapshot TEXT NOT NULL CHECK(length(trim(shooter_display_name_snapshot)) >= 2),
        shooter_laterality_snapshot TEXT NOT NULL CHECK(shooter_laterality_snapshot IN ('right', 'left')),
        weapon_name_snapshot TEXT NOT NULL CHECK(length(trim(weapon_name_snapshot)) > 0),
        target_type_name_snapshot TEXT NOT NULL CHECK(length(trim(target_type_name_snapshot)) > 0),
        target_width_mm_snapshot INTEGER NULL CHECK(target_width_mm_snapshot IS NULL OR target_width_mm_snapshot > 0),
        target_height_mm_snapshot INTEGER NULL CHECK(target_height_mm_snapshot IS NULL OR target_height_mm_snapshot > 0),
        started_at TEXT NULL,
        completed_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(shooter_profile_id) REFERENCES shooter_profiles(id) ON DELETE RESTRICT,
        FOREIGN KEY(weapon_id) REFERENCES weapons(id) ON DELETE RESTRICT,
        FOREIGN KEY(target_type_id) REFERENCES target_types(id) ON DELETE RESTRICT,
        CHECK(
          mode = 'coaching_free'
          OR length(trim(COALESCE(objective_label, ''))) > 0
          OR selected_skill_id IS NOT NULL
        ),
        CHECK(
          (status = 'draft' AND started_at IS NULL)
          OR (status <> 'draft' AND started_at IS NOT NULL)
        ),
        CHECK(completed_at IS NULL OR status = 'completed')
      );

      CREATE INDEX sessions_shooter_profile_id_idx ON sessions(shooter_profile_id);
      CREATE INDEX sessions_created_at_idx ON sessions(created_at);
    `,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE series (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        sequence_number INTEGER NOT NULL CHECK(sequence_number >= 1),
        type TEXT NOT NULL CHECK(type IN ('reference', 'diagnostic', 'corrective', 'consolidation', 'progression')),
        status TEXT NOT NULL CHECK(status IN ('planned', 'active', 'completed', 'cancelled')),
        expected_shot_count INTEGER NOT NULL CHECK(expected_shot_count BETWEEN 1 AND 50),
        recorded_shot_count INTEGER NOT NULL DEFAULT 0 CHECK(recorded_shot_count BETWEEN 0 AND 50),
        instruction TEXT NULL,
        pedagogical_objective TEXT NULL,
        selected_skill_id TEXT NULL,
        duration_seconds INTEGER NULL CHECK(duration_seconds IS NULL OR duration_seconds >= 1),
        cadence_type TEXT NULL CHECK(cadence_type IS NULL OR cadence_type IN ('free', 'timed', 'fixed_interval', 'unknown')),
        notes TEXT NULL,
        started_at TEXT NULL,
        completed_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        UNIQUE(session_id, sequence_number),
        CHECK(status <> 'planned' OR (started_at IS NULL AND completed_at IS NULL)),
        CHECK(status <> 'active' OR (started_at IS NOT NULL AND completed_at IS NULL)),
        CHECK(status <> 'completed' OR (started_at IS NOT NULL AND completed_at IS NOT NULL)),
        CHECK(status <> 'cancelled' OR completed_at IS NULL)
      );

      CREATE INDEX series_session_sequence_idx ON series(session_id, sequence_number);
      CREATE UNIQUE INDEX series_one_active_per_session_idx
        ON series(session_id) WHERE status = 'active';

      CREATE TRIGGER sessions_prevent_completion_with_active_series
      BEFORE UPDATE OF status ON sessions
      WHEN NEW.status = 'completed' AND EXISTS (
        SELECT 1 FROM series
        WHERE session_id = NEW.id AND status = 'active'
      )
      BEGIN
        SELECT RAISE(ABORT, 'active series prevents session completion');
      END;
    `,
  },
  {
    version: 4,
    sql: `
      CREATE TABLE impacts (
        id TEXT PRIMARY KEY NOT NULL,
        series_id TEXT NOT NULL,
        sequence_number INTEGER NOT NULL CHECK(sequence_number >= 1),
        normalized_x REAL NOT NULL CHECK(normalized_x BETWEEN 0 AND 1),
        normalized_y REAL NOT NULL CHECK(normalized_y BETWEEN 0 AND 1),
        target_x REAL NULL,
        target_y REAL NULL,
        physical_x_mm REAL NULL,
        physical_y_mm REAL NULL,
        source TEXT NOT NULL CHECK(source IN ('manual', 'automatic', 'corrected')),
        confidence REAL NULL CHECK(confidence IS NULL OR confidence BETWEEN 0 AND 1),
        is_excluded INTEGER NOT NULL DEFAULT 0 CHECK(is_excluded IN (0, 1)),
        exclusion_reason TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(series_id) REFERENCES series(id) ON DELETE RESTRICT,
        UNIQUE(series_id, sequence_number),
        CHECK(is_excluded = 0 OR length(trim(COALESCE(exclusion_reason, ''))) > 0),
        CHECK(is_excluded = 1 OR exclusion_reason IS NULL)
      );

      CREATE INDEX impacts_series_sequence_idx ON impacts(series_id, sequence_number);

      CREATE TRIGGER impacts_insert_active_series
      BEFORE INSERT ON impacts
      WHEN (SELECT status FROM series WHERE id = NEW.series_id) <> 'active'
      BEGIN SELECT RAISE(ABORT, 'impacts require active series'); END;

      CREATE TRIGGER impacts_update_active_series
      BEFORE UPDATE ON impacts
      WHEN (SELECT status FROM series WHERE id = OLD.series_id) <> 'active'
      BEGIN SELECT RAISE(ABORT, 'completed impacts are read only'); END;

      CREATE TRIGGER impacts_delete_active_series
      BEFORE DELETE ON impacts
      WHEN (SELECT status FROM series WHERE id = OLD.series_id) <> 'active'
      BEGIN SELECT RAISE(ABORT, 'completed impacts are read only'); END;
    `,
  },
  {
    version: 5,
    sql: `
      CREATE TABLE series_metrics (
        id TEXT PRIMARY KEY NOT NULL,
        series_id TEXT NOT NULL,
        algorithm_version TEXT NOT NULL,
        target_geometry_version TEXT NOT NULL,
        included_impact_ids_json TEXT NOT NULL,
        included_impact_count INTEGER NOT NULL,
        excluded_impact_count INTEGER NOT NULL,
        centroid_x REAL NULL,
        centroid_y REAL NULL,
        horizontal_offset REAL NULL,
        vertical_offset REAL NULL,
        centroid_distance_to_target_center REAL NULL,
        spread_width REAL NULL,
        spread_height REAL NULL,
        extreme_spread REAL NULL,
        mean_radius REAL NULL,
        radial_standard_deviation REAL NULL,
        mean_distance_to_target_center REAL NULL,
        physical_metrics_json TEXT NULL,
        shape_classification TEXT NOT NULL CHECK(shape_classification IN
          ('indeterminate', 'compact', 'horizontal', 'vertical', 'both_axes')),
        potentially_atypical_impact_ids_json TEXT NOT NULL,
        computed_at TEXT NOT NULL,
        FOREIGN KEY(series_id) REFERENCES series(id) ON DELETE RESTRICT,
        UNIQUE(series_id, algorithm_version, target_geometry_version)
      );
      CREATE INDEX series_metrics_series_id_idx ON series_metrics(series_id);
    `,
  },
  {
    version: 6,
    sql: `
      DROP TRIGGER impacts_insert_active_series;
      DROP TRIGGER impacts_update_active_series;
      DROP TRIGGER impacts_delete_active_series;

      CREATE TRIGGER impacts_insert_editable_series
      BEFORE INSERT ON impacts
      WHEN (SELECT status FROM series WHERE id = NEW.series_id) NOT IN ('active', 'completed')
      BEGIN SELECT RAISE(ABORT, 'impacts require an editable series'); END;

      CREATE TRIGGER impacts_update_editable_series
      BEFORE UPDATE ON impacts
      WHEN (SELECT status FROM series WHERE id = OLD.series_id) NOT IN ('active', 'completed')
      BEGIN SELECT RAISE(ABORT, 'series impacts are read only'); END;

      CREATE TRIGGER impacts_delete_editable_series
      BEFORE DELETE ON impacts
      WHEN (SELECT status FROM series WHERE id = OLD.series_id) NOT IN ('active', 'completed')
      BEGIN SELECT RAISE(ABORT, 'series impacts are read only'); END;
    `,
  },
  {
    version: 7,
    sql: `
      CREATE TABLE series_comparisons (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        baseline_series_id TEXT NOT NULL,
        compared_series_id TEXT NOT NULL,
        comparison_type TEXT NOT NULL CHECK(comparison_type IN ('reference', 'previous', 'manual')),
        status TEXT NOT NULL CHECK(status IN ('comparable', 'partially_comparable', 'not_comparable')),
        algorithm_version TEXT NOT NULL,
        thresholds_version TEXT NOT NULL,
        baseline_metrics_version TEXT NOT NULL,
        compared_metrics_version TEXT NOT NULL,
        result_json TEXT NOT NULL,
        computed_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(baseline_series_id) REFERENCES series(id) ON DELETE RESTRICT,
        FOREIGN KEY(compared_series_id) REFERENCES series(id) ON DELETE RESTRICT,
        UNIQUE(baseline_series_id, compared_series_id, comparison_type, algorithm_version)
      );
      CREATE INDEX series_comparisons_session_idx ON series_comparisons(session_id);

      CREATE TRIGGER series_metrics_invalidate_comparisons_insert
      AFTER INSERT ON series_metrics
      BEGIN
        DELETE FROM series_comparisons
        WHERE baseline_series_id = NEW.series_id OR compared_series_id = NEW.series_id;
      END;
      CREATE TRIGGER series_metrics_invalidate_comparisons_update
      AFTER UPDATE ON series_metrics
      BEGIN
        DELETE FROM series_comparisons
        WHERE baseline_series_id = NEW.series_id OR compared_series_id = NEW.series_id;
      END;
      CREATE TRIGGER series_metrics_invalidate_comparisons_delete
      AFTER DELETE ON series_metrics
      BEGIN
        DELETE FROM series_comparisons
        WHERE baseline_series_id = OLD.series_id OR compared_series_id = OLD.series_id;
      END;
    `,
  },
  {
    version: 8,
    sql: `
      DROP TRIGGER impacts_insert_editable_series;
      DROP TRIGGER impacts_update_editable_series;
      DROP TRIGGER impacts_delete_editable_series;

      CREATE TRIGGER impacts_insert_active_series_v8
      BEFORE INSERT ON impacts
      WHEN (SELECT status FROM series WHERE id = NEW.series_id) <> 'active'
      BEGIN SELECT RAISE(ABORT, 'impacts require active series'); END;
      CREATE TRIGGER impacts_update_active_series_v8
      BEFORE UPDATE ON impacts
      WHEN (SELECT status FROM series WHERE id = OLD.series_id) <> 'active'
      BEGIN SELECT RAISE(ABORT, 'completed impacts are read only'); END;
      CREATE TRIGGER impacts_delete_active_series_v8
      BEFORE DELETE ON impacts
      WHEN (SELECT status FROM series WHERE id = OLD.series_id) <> 'active'
      BEGIN SELECT RAISE(ABORT, 'completed impacts are read only'); END;

      CREATE TABLE shooting_observations (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        series_id TEXT NULL,
        comparison_id TEXT NULL,
        observation_code TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('centering', 'dispersion_shape', 'combined', 'data_quality', 'evolution')),
        scope TEXT NOT NULL CHECK(scope IN ('single_series', 'comparison', 'session_pattern')),
        status TEXT NOT NULL CHECK(status IN ('confirmed_by_rules', 'tentative', 'insufficient_data', 'contradictory_data')),
        magnitude TEXT NULL CHECK(magnitude IS NULL OR magnitude IN ('low', 'medium', 'high')),
        confidence_level TEXT NOT NULL CHECK(confidence_level IN ('low', 'medium', 'high')),
        rank TEXT NOT NULL CHECK(rank IN ('primary', 'secondary', 'limitation')),
        algorithm_version TEXT NOT NULL,
        ruleset_version TEXT NOT NULL,
        thresholds_version TEXT NOT NULL,
        source_version TEXT NOT NULL,
        supporting_metrics_json TEXT NOT NULL,
        limiting_factors_json TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        result_json TEXT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(series_id) REFERENCES series(id) ON DELETE RESTRICT,
        FOREIGN KEY(comparison_id) REFERENCES series_comparisons(id) ON DELETE CASCADE
      );
      CREATE INDEX shooting_observations_series_idx ON shooting_observations(series_id);
      CREATE INDEX shooting_observations_comparison_idx ON shooting_observations(comparison_id);
      CREATE INDEX shooting_observations_session_idx ON shooting_observations(session_id, scope);

      CREATE TRIGGER series_metrics_invalidate_observations_insert
      AFTER INSERT ON series_metrics BEGIN
        DELETE FROM shooting_observations WHERE series_id = NEW.series_id OR scope = 'session_pattern';
      END;
      CREATE TRIGGER series_metrics_invalidate_observations_update
      AFTER UPDATE ON series_metrics BEGIN
        DELETE FROM shooting_observations WHERE series_id = NEW.series_id OR scope = 'session_pattern';
      END;
      CREATE TRIGGER series_metrics_invalidate_observations_delete
      AFTER DELETE ON series_metrics BEGIN
        DELETE FROM shooting_observations WHERE series_id = OLD.series_id OR scope = 'session_pattern';
      END;
      CREATE TRIGGER series_comparisons_invalidate_observations_update
      AFTER UPDATE ON series_comparisons BEGIN
        DELETE FROM shooting_observations WHERE comparison_id = NEW.id;
      END;
      CREATE TRIGGER series_comparisons_invalidate_observations_delete
      AFTER DELETE ON series_comparisons BEGIN
        DELETE FROM shooting_observations WHERE comparison_id = OLD.id;
      END;
    `,
  },
  {
    version: 9,
    sql: `
      CREATE TABLE technical_hypotheses (
        id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, series_id TEXT NULL,
        comparison_id TEXT NULL, observation_id TEXT NOT NULL, hypothesis_code TEXT NOT NULL,
        category TEXT NOT NULL, status TEXT NOT NULL, plausibility_level TEXT NOT NULL,
        confidence_level TEXT NOT NULL, rank INTEGER NOT NULL, internal_score REAL NOT NULL,
        supporting_evidence_json TEXT NOT NULL, contradicting_evidence_json TEXT NOT NULL,
        missing_evidence_json TEXT NOT NULL, applicable_context_json TEXT NOT NULL,
        source_rules_json TEXT NOT NULL, ruleset_version TEXT NOT NULL, generated_at TEXT NOT NULL,
        result_json TEXT NOT NULL, FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(series_id) REFERENCES series(id) ON DELETE CASCADE,
        FOREIGN KEY(comparison_id) REFERENCES series_comparisons(id) ON DELETE CASCADE,
        FOREIGN KEY(observation_id) REFERENCES shooting_observations(id) ON DELETE CASCADE
      );
      CREATE INDEX technical_hypotheses_series_idx ON technical_hypotheses(series_id,rank);
      CREATE TABLE diagnostic_questions (
        code TEXT PRIMARY KEY NOT NULL, text_fr TEXT NOT NULL, definition_json TEXT NOT NULL
      );
      CREATE TABLE diagnostic_answers (
        id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, series_id TEXT NOT NULL,
        question_code TEXT NOT NULL, answer_value TEXT NOT NULL CHECK(answer_value IN ('yes','no','uncertain','not_observed')),
        answered_at TEXT NOT NULL, UNIQUE(series_id,question_code),
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(series_id) REFERENCES series(id) ON DELETE CASCADE
      );
      CREATE TRIGGER observations_invalidate_hypotheses_insert AFTER INSERT ON shooting_observations
      BEGIN DELETE FROM technical_hypotheses WHERE series_id=NEW.series_id OR comparison_id=NEW.comparison_id; END;
      CREATE TRIGGER observations_invalidate_hypotheses_update AFTER UPDATE ON shooting_observations
      BEGIN DELETE FROM technical_hypotheses WHERE observation_id=OLD.id; END;
      CREATE TRIGGER observations_invalidate_hypotheses_delete AFTER DELETE ON shooting_observations
      BEGIN DELETE FROM technical_hypotheses WHERE observation_id=OLD.id; END;
      CREATE TRIGGER answers_invalidate_hypotheses_insert AFTER INSERT ON diagnostic_answers
      BEGIN DELETE FROM technical_hypotheses WHERE series_id=NEW.series_id; END;
      CREATE TRIGGER answers_invalidate_hypotheses_update AFTER UPDATE ON diagnostic_answers
      BEGIN DELETE FROM technical_hypotheses WHERE series_id=NEW.series_id; END;
      CREATE TRIGGER answers_invalidate_hypotheses_delete AFTER DELETE ON diagnostic_answers
      BEGIN DELETE FROM technical_hypotheses WHERE series_id=OLD.series_id; END;
    `,
  },
  {
    version: 10,
    sql: `
      CREATE TABLE confirmation_test_runs (
        id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, source_series_id TEXT NOT NULL,
        hypothesis_id TEXT NOT NULL, test_code TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('proposed','accepted','in_progress','completed','cancelled','not_applicable','unsafe_in_current_context')),
        started_at TEXT NULL, completed_at TEXT NULL,
        outcome TEXT NULL CHECK(outcome IS NULL OR outcome IN ('supports_hypothesis','weakly_supports_hypothesis','does_not_support_hypothesis','contradicts_hypothesis','inconclusive','not_observed')),
        ruleset_version TEXT NOT NULL, result_json TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(source_series_id) REFERENCES series(id) ON DELETE RESTRICT,
        FOREIGN KEY(hypothesis_id) REFERENCES technical_hypotheses(id) ON DELETE RESTRICT
      );
      CREATE INDEX confirmation_test_runs_session_idx ON confirmation_test_runs(session_id,status);
      CREATE TABLE coaching_recommendations (
        id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, hypothesis_id TEXT NOT NULL,
        confirmation_test_run_id TEXT NULL, recommendation_code TEXT NOT NULL,
        recommendation_type TEXT NOT NULL CHECK(recommendation_type IN ('advice','drill')),
        status TEXT NOT NULL CHECK(status IN ('proposed','accepted','in_progress','completed','skipped','cancelled')),
        priority INTEGER NOT NULL CHECK(priority >= 1), ruleset_version TEXT NOT NULL,
        generated_at TEXT NOT NULL, result_json TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(hypothesis_id) REFERENCES technical_hypotheses(id) ON DELETE RESTRICT,
        FOREIGN KEY(confirmation_test_run_id) REFERENCES confirmation_test_runs(id) ON DELETE RESTRICT
      );
      CREATE INDEX coaching_recommendations_session_idx ON coaching_recommendations(session_id,status);
      CREATE TABLE coaching_cycles (
        id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, source_series_id TEXT NOT NULL,
        hypothesis_id TEXT NOT NULL, confirmation_test_run_id TEXT NULL, recommendation_id TEXT NULL,
        drill_code TEXT NULL, control_series_id TEXT NULL,
        status TEXT NOT NULL CHECK(status IN ('proposed','test_pending','test_completed','drill_pending','drill_in_progress','control_series_pending','evaluation_pending','completed','cancelled')),
        outcome TEXT NULL CHECK(outcome IS NULL OR outcome IN ('objective_improved','objective_stable','objective_worsened','mixed_result','insufficient_data')),
        started_at TEXT NOT NULL, completed_at TEXT NULL, invalidated_at TEXT NULL,
        invalidation_reason TEXT NULL, ruleset_version TEXT NOT NULL, result_json TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(source_series_id) REFERENCES series(id) ON DELETE RESTRICT,
        FOREIGN KEY(hypothesis_id) REFERENCES technical_hypotheses(id) ON DELETE RESTRICT,
        FOREIGN KEY(confirmation_test_run_id) REFERENCES confirmation_test_runs(id) ON DELETE RESTRICT,
        FOREIGN KEY(recommendation_id) REFERENCES coaching_recommendations(id) ON DELETE RESTRICT,
        FOREIGN KEY(control_series_id) REFERENCES series(id) ON DELETE RESTRICT
      );
      CREATE INDEX coaching_cycles_session_idx ON coaching_cycles(session_id,status);
      CREATE UNIQUE INDEX coaching_cycles_one_active_idx ON coaching_cycles(session_id)
        WHERE status NOT IN ('completed','cancelled');
      CREATE TRIGGER coaching_source_change_invalidates_open_cycle
      AFTER UPDATE ON shooting_observations
      BEGIN
        UPDATE coaching_cycles SET invalidated_at=datetime('now'),
          invalidation_reason='Observation source modifiée', status='cancelled',
          result_json=json_set(result_json,'$.invalidatedAt',datetime('now'),'$.invalidationReason','Observation source modifiée','$.status','cancelled')
        WHERE status NOT IN ('completed','cancelled') AND source_series_id=NEW.series_id;
      END;
    `,
  },
  {
    version: 11,
    sql: `
      ALTER TABLE sessions ADD COLUMN data_partition TEXT NOT NULL DEFAULT 'real'
        CHECK(data_partition IN ('real','demo','automated_test'));
      ALTER TABLE sessions ADD COLUMN synthetic_scenario_code TEXT NULL;
      CREATE INDEX sessions_partition_idx ON sessions(data_partition,created_at);

      CREATE TABLE reasoning_traces (
        id TEXT PRIMARY KEY NOT NULL, cycle_id TEXT NOT NULL, session_id TEXT NOT NULL,
        source_series_id TEXT NOT NULL, data_partition TEXT NOT NULL,
        trace_version TEXT NOT NULL, created_at TEXT NOT NULL, result_json TEXT NOT NULL,
        FOREIGN KEY(cycle_id) REFERENCES coaching_cycles(id) ON DELETE RESTRICT,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(source_series_id) REFERENCES series(id) ON DELETE RESTRICT
      );
      CREATE INDEX reasoning_traces_cycle_idx ON reasoning_traces(cycle_id,created_at);

      CREATE TABLE shooter_feedback (
        id TEXT PRIMARY KEY NOT NULL, cycle_id TEXT NOT NULL, session_id TEXT NOT NULL,
        created_at TEXT NOT NULL, result_json TEXT NOT NULL,
        FOREIGN KEY(cycle_id) REFERENCES coaching_cycles(id) ON DELETE RESTRICT,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT
      );
      CREATE TABLE instructor_feedback (
        id TEXT PRIMARY KEY NOT NULL, cycle_id TEXT NOT NULL, session_id TEXT NOT NULL,
        created_at TEXT NOT NULL, result_json TEXT NOT NULL,
        FOREIGN KEY(cycle_id) REFERENCES coaching_cycles(id) ON DELETE RESTRICT,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT
      );
      CREATE TABLE human_hypothesis_reviews (
        id TEXT PRIMARY KEY NOT NULL, cycle_id TEXT NOT NULL, hypothesis_id TEXT NOT NULL,
        verdict TEXT NOT NULL CHECK(verdict IN ('coherent','possible_unverified','unlikely','incorrect','impossible_to_evaluate')),
        evaluator_role TEXT NOT NULL, created_at TEXT NOT NULL, result_json TEXT NOT NULL,
        FOREIGN KEY(cycle_id) REFERENCES coaching_cycles(id) ON DELETE RESTRICT,
        FOREIGN KEY(hypothesis_id) REFERENCES technical_hypotheses(id) ON DELETE RESTRICT
      );
      CREATE TABLE local_issue_reports (
        id TEXT PRIMARY KEY NOT NULL, session_id TEXT NULL, series_id TEXT NULL, cycle_id TEXT NULL,
        screen TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL,
        data_partition TEXT NOT NULL, created_at TEXT NOT NULL, result_json TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY(series_id) REFERENCES series(id) ON DELETE RESTRICT,
        FOREIGN KEY(cycle_id) REFERENCES coaching_cycles(id) ON DELETE RESTRICT
      );
      CREATE TABLE demo_state (
        singleton_key INTEGER PRIMARY KEY NOT NULL CHECK(singleton_key=1),
        enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
        loaded_scenario_code TEXT NULL
      );
      INSERT INTO demo_state(singleton_key,enabled,loaded_scenario_code) VALUES(1,0,NULL);
      CREATE TABLE synthetic_demo_runs (
        id TEXT PRIMARY KEY NOT NULL, scenario_code TEXT NOT NULL, scenario_version TEXT NOT NULL,
        created_at TEXT NOT NULL, result_json TEXT NOT NULL
      );

      CREATE TRIGGER completed_series_immutable
      BEFORE UPDATE ON series WHEN OLD.status='completed'
      BEGIN SELECT RAISE(ABORT,'completed series are immutable'); END;

      CREATE TRIGGER completed_cycle_immutable
      BEFORE UPDATE ON coaching_cycles WHEN OLD.status='completed'
      BEGIN SELECT RAISE(ABORT,'completed coaching cycles are immutable'); END;
    `,
  },
  {
    version: 12,
    sql: `
      CREATE TABLE session_safety_contexts (
        session_id TEXT PRIMARY KEY NOT NULL,
        validated_at TEXT NOT NULL,
        result_json TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `,
  },
  {
    version: 13,
    sql: `
      ALTER TABLE sessions
      ADD COLUMN number_of_hands INTEGER NULL
      CHECK(number_of_hands IN (1, 2));
    `,
  },
];

export async function migrateDatabase(database: Database): Promise<void> {
  await database.execAsync("PRAGMA foreign_keys = ON;");
  const current = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const currentVersion = current?.user_version ?? 0;

  if (currentVersion > LATEST_DATABASE_VERSION) {
    throw new Error(
      `Base de données en version ${currentVersion}, application limitée à ${LATEST_DATABASE_VERSION}.`,
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration.sql);
      await database.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}

# Audit Pack

The audit export explains how a hiring recommendation was produced without exposing user API keys.

- `job`: approved role, jurisdiction flags, and rubric criteria.
- `candidates`: candidate and application records.
- `screeningRuns`: AI-assisted screening outputs with evidence and missing-information flags.
- `interviews`: interview guides and note summaries requiring human confirmation.
- `modelConfigs`: provider alias, base URL, model name, credential ID, workflow scope, and health status.
- `fairnessSnapshot`: aggregate selection rates from voluntary demographic records only.

The export must never include raw API keys, inferred protected traits, photos, video frames, or social-media data.

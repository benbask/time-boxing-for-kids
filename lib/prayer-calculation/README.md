# Prayer calculation module (Phase 5)

This folder is intentionally empty in Phase 1.

Phase 5 will add a local (offline) prayer-time calculation implementation using
verified Kemenag/SIHAT parameters. Requirements before any code lands here:

- every parameter (Fajr/Isha angle, Asr shadow factor, elevation correction,
  ihtiyati, timezone handling) is documented with its official source;
- results are compared against official Kemenag/SIHAT schedules for several
  cities and dates;
- discrepancies and their causes are documented in `SPEC.md`;
- no prayer time is hardcoded per city and no result is presented as verified
  before that comparison exists.

No calculation is performed in Phase 1.

# Migration Notes

- Original user upload: `shutter-urban-stylized-source.zip`
- This handoff preserves the exported source and adds Claude-specific project documentation.
- `src/lib/db.ts` was sanitized to remove the hardcoded SuperCool-managed database endpoint and now reads optional Vite environment variables.
- The generated Him Over There character concept board was copied into `public/assets` and `docs/reference`, and `src/game/imgs.ts` now uses that local concept asset.
- RESOLVED in handoff v2: the title skyline and 13 opening-story cinematic images are now stored locally under `public/assets/cinematics/opening/` and referenced from `src/game/imgs.ts`. The two optional later beats (social post and second referral inquiry) are intentionally deferred.
- No gameplay logic was intentionally rewritten in this handoff.

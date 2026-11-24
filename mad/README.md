# The Mad Scientists overlay

Everything in this directory is applied to the `structs-webapp` submodule as it
is built. Nothing in the submodule is edited. The client stays in English;
there is no translation layer.

| Path | What it is |
|---|---|
| `patches.cjs` | `[exact upstream text, replacement]` pairs per upstream file: the guild connection, recovery, the telemetry name, players' own pictures, the scientist picker, and Mad Scientists in place of SN Corp in sign-up and the tutorial |
| `runtime/` | Loaded before webapp's entry as `__mad`: `guild` (`guild.js`, the services of the guild the page plays through, Mad Scientists `0-9`), `recovery` (`recovery.js`, moving a recovered player of another guild into it), `pfp` (`pfp.js`, every portrait showing the player's `pfp` URL over the generated one, and setting a sign-up scientist as `pfp` on chain), `scientists` (`scientists.js`, the Mad Scientists gallery, at sign-up and on a member's own profile) and `account` (`account.js`, creating the account at sign-up without a recovery key section, and Download Player in place of Log Out) |
| `public/` | Static files served over webapp's: `guild.json` (guild `0-9`'s on-chain endpoint), `favicon.ico`, `pfp/` with the 10,000 Mad Scientists portraits (`1.png` to `10000.png`, 192px), and `mad/` with `mad.css`, the sign-up badge, the guild logo and icons |
| `page.cjs` | Renders webapp's Twig pages (`templates/`) to `index.html` and `sector-blitz/` (the public leaderboard), adding Google Tag Manager (`GTM-58HZKHDD`), the icons and `mad.css` |
| `overlay.cjs`, `loader.cjs` | Apply `patches.cjs` to each source file webpack reads |
| `scripts/make-pfps.py` | Rebuilds `public/pfp/` from the collection's 2400px originals in `../MadScientists/images` |
| `check.cjs` | `npm run check` / `npm test`: stale or orphaned patches, SN Corp left on screen, guild.json against `GUILD_ID` |

## Writing a patch

```js
'js/view_models/signup/Orientation7ViewModel.js': [
  ['on behalf of SN.CORPORATION.`', 'on behalf of MAD SCIENTISTS.`'],
],
```

- The first string is copied exactly from the upstream file; every occurrence
  is replaced, in one pass, longest first.
- Include enough around it (quotes, tags) that it only matches what you mean,
  never an id, class, storage key or anything sent to the guild or the chain.
  CSS classes such as `snc-logo` keep webapp's names.
- One key per upstream file: a second entry for the same file replaces the
  first.

## The art

`public/mad/img/mad-scientists-badge.png` is Mad Scientists' wordmark
(`../MadScientists/logos/official-brand-pack/ms_logo_nobg.png`, at its own
pixels) in the top of a 384px square, the shape of webapp's 192px sign-up logo
slot, with the motto set under it by `mad.css`. `mad-scientists-logo.png` is
the same wordmark, 512px square, for `guild.json`. The icons are Mad
Scientists' own (`logos/icons/`).

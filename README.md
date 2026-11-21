# madscientists.structs.zone — Structs for Mad Scientists

The [structs-webapp](https://github.com/playstructs/structs-webapp) game client
for [Mad Scientists](https://www.madscientists.io/)'s Structs guild (`MAD`, guild
`0-9`). structs-webapp is a git submodule (`structs-webapp/`, following its
`main`) and its client is built as it is: its own JavaScript, page, styles and
art, in English, with its webpack configuration as the starting point. What
this repository adds is the overlay in [`mad/`](mad/README.md), applied while
webpack reads webapp's sources. Nothing in the submodule is edited, so a newer
structs-webapp builds with the same overlay.

Only the client side is used. This site hosts no guild API of its own: the page
talks straight to the guild's API, its GRASS feed and its chain node, which
`beta.playstructs.com` runs for Mad Scientists.

Onboarding and tutorial telemetry is reported with the interface name
`madscientists.structs.zone`, so these runs can be told apart from other clients' in the
guild's reports (`?interface_name=madscientists.structs.zone`).

## Setup

```bash
git clone --recurse-submodules <this repository>
npm install          # also installs structs-webapp/src's own dependencies
npm run dev          # http://localhost:5193
```

## Updating structs-webapp

```bash
npm run update:webapp
```

This moves the submodule to the latest `main`, installs its dependencies and
runs the check, which lists what the update touched:

| Report | Meaning | What to do |
|---|---|---|
| `stale` | upstream changed the text a patch replaces | fix the patch in `mad/patches.cjs` |
| `orphan` | a patched upstream file is gone | move or delete its patches |
| `branding` | SN Corp is named somewhere a player sees | add a patch naming Mad Scientists |
| `guild` | `mad/public/guild.json` and `GUILD_ID` disagree | fix whichever is wrong |

`npm test` fails while any remain. The build shows stale patches as warnings.
Commit the submodule pointer together with the overlay.

## Profile pictures

Every portrait (the HUD, profile, guild roster, player search, scans, spectator
and device activation) shows the player's own picture, their `pfp` on chain,
when it is a URL a browser can load: `https` (`http` is upgraded), or `ipfs://`,
`ipns://` and `ar://` through the ipfs.io and arweave.net gateways. webapp's
generated portrait stays underneath, and shows when a player has no such
picture or it fails to load (`mad/runtime/pfp.js`). Sector Blitz's public raid
lists are the exception: the guild API sends them only the generated portrait's
attributes, so they show a player's picture only when it is in those too, as it
is for everyone who signs up here.

At sign-up, **Choose scientist** beside the generated picture opens a gallery
of every Mad Scientist, `#1` to `#10000`, edge to edge in one endless scroll
(more are added as the player nears the end; images load as they come into
view). A player who knows their scientist's number finds it: the gallery
scrolls to it and outlines it. Clicking a scientist chooses it. No wallet is
involved: the picture is the player's choice. The gallery's controls are
webapp's own SUI components: screen buttons, the text input and its warning,
and the close link (`mad/runtime/scientists.js`).

The portraits are this site's own files, `mad/public/pfp/<id>.png`, served at
`https://madscientists.structs.zone/pfp/<id>.png`, which is the URL a player's
`pfp` holds, so any client can link them. The page itself loads them from its
own origin, so they show in development too. They are the collection's
originals (`../MadScientists/images`, 2400px) at the 192px their pixel art is
drawn on, the same picture at a fifth of the bytes (15 MB for all 10,000);
`mad/scripts/make-pfps.py` rebuilds them (Pillow).

That URL can't go into the sign-up request's `pfp`: the guild API requires it
to be JSON, which the chain then refuses as a pfp. So it goes in
`pfp_client_render_attributes` as `url` (beside the generated layers, which
other clients keep showing), the player joins with it, and when they first play,
their own key sets their `pfp` on chain to the same URL
(`MsgPlayerUpdatePfp`).

## Which guild

The site is Mad Scientists': its guild is `0-9`, fixed in `webpack.config.js`
(`GUILD_ID`), and never looked up. Webapp normally asks its guild API which
guild it is (`/guild/this`), but Mad Scientists shares SN Corp's API, so the page
asks for `/guild/0-9` instead.

Before webapp's code starts, the page reads `0-9`'s `guild.json` (the endpoint
the guild set on chain, `https://madscientists.structs.zone/guild.json`, which this site
serves from [`mad/public/guild.json`](mad/public/guild.json)) for its
`guild_api`, `grass_nats_websocket` and `client_websocket`
(`mad/runtime/guild.js`). If it can't be read, it uses what it last read, then
the fallback in `webpack.config.js`. Requests carry a bearer token from the
guild's `/api/auth/token` (the same signed login as `/api/auth/login`), since a
guild's session cookie would be third-party here.

Account recovery asks the chain which guild the key's player is in before it
calls the guild API, since a shared API may log in another guild's player. A
player of another guild is moved here first: the key signs
`MsgGuildMembershipJoin` for this guild (allowed when its join minimum is 0),
and recovery goes on once the chain shows the move and the guild API knows the
player. Recovery stops instead when the player owns their guild, the guild asks
a join minimum, or the chain can't be read (`mad/runtime/recovery.js`).

| Variable (build time) | Default | |
|---|---|---|
| `MAD_LCD_URL` | `https://public.testnet.structs.network` | the chain node the guild is read from |
| `MAD_GUILD_API` | — | a fixed guild API (a local guild in development), skipping guild.json |
| `MAD_GRASS_URL`, `MAD_CHAIN_WS` | — | override what the guild publishes |

### On chain

| | |
|---|---|
| Guild | `0-9` Mad Scientists, tag `MAD`, owned by founder player `1-580` (`structs15wpld4qrdapx30fpczyvy4yurve6wyjta2ngeh`) |
| Primary reactor | `3-12` NodeSafe (`structsvaloper1fz6cxatcuk9dkmdks9zun9rpn66g93et7anm64`) |
| Entry substation | `4-20`, fed by allocation `6-70` from the guild's own stake |
| Joining | open: join minimum 0, invite bypass permissioned |
| Endpoint | `https://madscientists.structs.zone/guild.json` |
| Sign-up (TSA) | player `1-14657` (`structs1256z34se27d43ap30pkvx6n52uzf5jpwy0exfc`), the host's proxy-join signer: 512 (GuildMembership) on `0-9`, 1024 (SubstationConnection) on `4-20` |
| Bank denom | `beaker` / `ubeaker` (in guild.json) |

## Building and serving

```bash
npm run build        # dist/
```

`dist/` is a static site: `index.html` (webapp's game page), the bundles in
`js/` and webapp's `css/`, `img/`, `lottie/` and fonts, plus `guild.json`, Mad
Scientists' art in `mad/` and the 10,000 portraits in `pfp/`. It uses absolute
paths, so serve it from the root of `madscientists.structs.zone`; it needs
nothing else on that domain, but `guild.json` must be readable cross-origin
(`Access-Control-Allow-Origin: *`), since other clients read it, and so should
`pfp/`, for other clients showing players' pictures.
`.github/workflows/pages.yml` publishes it to GitHub Pages (which sends that
header for every file).

## Licences

structs-webapp is Apache-2.0 (Slow Ninja Inc). Mad Scientists' logo, icons and
portraits in `mad/public/` are Mad Scientists' own, used for its guild.

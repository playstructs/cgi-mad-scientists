// Profile pictures: the player's own picture first, webapp's generated one
// only when there is none.
//
// A player's picture on chain is `pfp`, a URL (or an opaque id). webapp never
// shows it: every portrait is drawn from `pfp_client_render_attributes`, the
// layers of its generated robot. Here every portrait shows the player's `pfp`
// when it is a URL a browser can load, over the generated layers, which stay
// underneath as the fallback: a picture that fails to load is removed.
//
// The URL travels inside the render attributes, as `url`:
// - mad/patches.cjs has PlayerFactory and PlayerSearchResultDTOFactory (every
//   player and player search result webapp reads) put the player's `pfp` there,
//   which every portrait already receives;
// - sign-up puts the chosen Mad Scientist there (scientists.js), since the
//   guild API's sign-up request can't carry a URL in `pfp` (it requires JSON,
//   which the chain refuses in a pfp). Once the player exists, their own key
//   sets `pfp` on chain to the same URL (the RENDER_PLAYER_PFP listener below).
//
// The Mad Scientists portraits are this site's own files (mad/public/pfp), so
// a player's pfp names them on this site's domain, and this page loads them
// from wherever it is served (its own origin, or localhost in development).
import {PfpClientRenderAttributes} from '../../structs-webapp/src/js/models/PfpClientRenderAttributes.js';

export const SITE = 'https://madscientists.structs.zone';
export const FIRST_ID = 1;
export const LAST_ID = 10000;

const SCIENTIST = /^https:\/\/madscientists\.structs\.zone\/pfp\/(\d{1,5})\.png$/;
const GATEWAYS = {
  'ipfs:': 'https://ipfs.io/ipfs/',
  'ipns:': 'https://ipfs.io/ipns/',
  'ar:': 'https://arweave.net/',
};
const PLACEHOLDER = '<img class="pfp-viewer-layer" src="/img/portrait-placeholder.png" alt="Profile picture">';

/** The Mad Scientist's portrait as this page loads it: from its own origin. */
export const scientistPath = id => `/pfp/${Number.parseInt(id, 10)}.png`;

/** The Mad Scientist's portrait as a player's pfp names it. */
export const scientistUrl = id => SITE + scientistPath(id);

/** @return {number|null} the Mad Scientist this pfp is, if it is one */
export function scientistId(value) {
  const match = typeof value === 'string' ? value.match(SCIENTIST) : null;
  const id = match ? Number(match[1]) : null;
  return id !== null && id >= FIRST_ID && id <= LAST_ID ? id : null;
}

export const isScientist = value => scientistId(value) !== null;

/**
 * @param {*} value a pfp as players set it
 * @return {string|null} a URL an <img> can load, or null
 */
export function src(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    return null;
  }
  const scientist = scientistId(value.trim());
  if (scientist !== null) {
    return scientistPath(scientist);
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null; // an opaque id, or not a URL
  }
  if (GATEWAYS[url.protocol]) {
    // ipfs://CID/path and ipfs:CID/path alike.
    const id = (url.host + url.pathname).replace(/^\/+/, '');
    return id ? GATEWAYS[url.protocol] + id + url.search : null;
  }
  if (url.protocol === 'http:') {
    url.protocol = 'https:'; // a secure page can't show it otherwise
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    return null;
  }
  return url.href;
}

const escape = text => text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Patched into PfpClientRenderAttributes.fromJson: keeps the `url` webapp's model drops. */
export function keepUrl(obj, attributes) {
  if (typeof obj?.url === 'string' && obj.url) {
    attributes.url = obj.url;
  }
  return attributes;
}

/**
 * Patched into the player factories: the player's own picture, `pfp`, into the
 * render attributes every portrait is drawn from.
 *
 * @param {string|null} pfp the player's pfp on chain
 * @param {PfpClientRenderAttributes|null} attributes
 * @return {PfpClientRenderAttributes|null}
 */
export function attributes(pfp, attributes) {
  if (!src(pfp)) {
    return attributes;
  }
  const merged = attributes ?? new PfpClientRenderAttributes();
  merged.url = pfp;
  return merged;
}

/**
 * Patched into PfpViewerComponent.renderHTML.
 *
 * @param {object|null} pfp the component's render attributes
 * @param {string} layers webapp's own HTML for them
 * @return {string}
 */
export function html(pfp, layers) {
  const url = src(pfp?.url);
  if (!url) {
    return layers;
  }
  return `${layers || PLACEHOLDER}<img class="pfp-viewer-layer mad-pfp-url" src="${escape(url)}" alt="Profile picture" referrerpolicy="no-referrer">`;
}

// A picture that can't be loaded leaves the generated one showing.
window.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement && event.target.classList.contains('mad-pfp-url')) {
    event.target.remove();
  }
}, true);

// The Mad Scientist chosen at sign-up is in the player's render attributes;
// once the player exists their own key sets it as their pfp on chain. Only a
// key that is the player's own primary address does it (not a device key, nor
// in spectator mode, where the "player" is someone else), and once a page load.
const synced = new Set();
window.addEventListener('RENDER_PLAYER_PFP', event => {
  if (event.playerType !== 'player') {
    return;
  }
  const {gameState, signingClientManager} = globalThis;
  const player = gameState?.keyPlayers?.player?.player;
  const url = player?.pfp_client_render_attributes?.url;
  if (!player?.id || player.pfp || !isScientist(url) || synced.has(player.id)) {
    return;
  }
  if (!signingClientManager || !gameState.signingAccount || gameState.signingAccount.address !== player.primary_address) {
    return;
  }
  synced.add(player.id);
  signingClientManager.queueMsgPlayerUpdatePfp(player.id, url)
    .then(() => {
      player.pfp = url;
      console.info(`[mad] pfp of ${player.id} set to ${url}`);
    })
    .catch(error => console.warn(`[mad] pfp of ${player.id} not set: ${error?.message ?? error}`));
});

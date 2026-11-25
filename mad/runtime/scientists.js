// Choosing a Mad Scientist as the profile picture at sign-up.
//
// "Choose scientist", beside the generated picture, opens a gallery of every
// Mad Scientist (1 to 10000), as this site hosts them (mad/public/pfp), in one
// endless scroll: more are added as the player nears the end, and images load
// only as they come into view. A player who knows their scientist's number
// finds it: the gallery scrolls to it and outlines it. Clicking a scientist
// chooses it, and its portrait, https://madscientists.structs.zone/pfp/<id>.png,
// becomes the player's picture (pfp.js). No wallet is asked for: the picture
// is the player's choice.
//
// Its controls are webapp's own SUI components: screen buttons, the text input
// and the close link.
import {FIRST_ID, LAST_ID, scientistId, scientistPath, scientistUrl, attributes} from './pfp.js';
import {PfpViewerComponent} from '../../structs-webapp/src/js/view_models/components/PfpViewerComponent.js';

const BATCH = 120;
const ID_PATTERN = /^\d{1,5}$/;

/** @return {number|null} the scientist with this number, if there is one */
function parseId(text) {
  const value = String(text).trim().replace(/^#/, '');
  if (!ID_PATTERN.test(value)) return null;
  const id = Number(value);
  return id >= FIRST_ID && id <= LAST_ID ? id : null;
}

/** @return {number|null} the scientist the render attributes picture, if any */
const chosenId = pfp => scientistId(pfp?.url);

/**
 * Adds "Choose scientist" to the sign-up profile screen (SetUsernameViewModel,
 * patched to call this once its picture is shown).
 *
 * @param {object} viewModel SetUsernameViewModel
 * @param {object} menuPage webapp's MenuPage
 */
function mount(viewModel, menuPage) {
  const refresh = document.getElementById(viewModel.regeneratePfpBtnId);
  const body = document.querySelector('.set-username-screen-body');
  if (!refresh || !body) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'mad-scientist-btn';
  button.className = 'sui-screen-btn sui-mod-secondary';
  button.textContent = 'Choose scientist';
  refresh.after(button);

  const picker = createPicker(body, {
    current: () => chosenId(viewModel.pfpViewerComponent?.pfp),
    say: text => menuPage.setDialogueScreenContent(text, true),
    choose: id => {
      const component = viewModel.pfpViewerComponent;
      // The generated layers stay, under the scientist, for clients that don't show URLs.
      component.pfp = {...(component.pfp ?? {}), url: scientistUrl(id)};
      component.render();
      viewModel.gameState.signupRequest.pfp_client_render_attributes = component.getPfpJson();
      menuPage.setDialogueScreenContent(`Mad Scientist #${id} it is. Now, your display name.`, true);
    },
  });
  button.addEventListener('click', picker.open);
}

/**
 * The gallery, hidden over `host` until opened: at sign-up (mount) and on the
 * player's own profile (mountProfile).
 *
 * @param {HTMLElement} host positioned element the gallery covers
 * @param {object} options
 * @param {function(): (number|null)} options.current the scientist chosen now, if any
 * @param {function(string): void} options.say shows the gallery's messages
 * @param {function(number): void} options.choose called with the chosen number
 * @param {HTMLElement} [options.viewport] the scrolling element `host` is in,
 *   when `host` may be taller than it: the gallery then ends where it does
 * @return {{open: function(): void, close: function(): void}}
 */
function createPicker(host, {current, say, choose, viewport = null}) {
  host.querySelector('.mad-scientist-picker')?.remove();
  const panel = document.createElement('div');
  panel.id = 'mad-scientist-picker';
  panel.className = 'mad-scientist-picker hidden';
  panel.innerHTML = `
    <div class="mad-scientist-picker-layout">
      <div class="mad-scientist-picker-header">
        <span class="sui-text-header">Mad Scientists</span>
        <a id="mad-scientist-close" class="sui-screen-nav-close" href="javascript: void(0)" aria-label="Close">
          <i class="sui-icon-sm icon-close"></i>
        </a>
      </div>
      <div class="common-inline-text-input-group-container">
        <div class="common-inline-text-input-controls-container">
          <label class="sui-input-text" for="mad-scientist-id">
            <span>Find by Number</span>
            <input type="text" inputmode="numeric" autocomplete="off" name="mad-scientist-id" id="mad-scientist-id" placeholder="${FIRST_ID} to ${LAST_ID}">
          </label>
          <button id="mad-scientist-id-btn" class="sui-screen-btn sui-mod-disabled" type="button" disabled>Find</button>
        </div>
      </div>
      <div id="mad-scientist-scroll" class="mad-scientist-scroll">
        <div id="mad-scientist-grid" class="mad-scientist-grid"></div>
      </div>
    </div>`;
  host.append(panel);

  const scroller = panel.querySelector('#mad-scientist-scroll');
  const grid = panel.querySelector('#mad-scientist-grid');
  const idInput = panel.querySelector('#mad-scientist-id');
  const idButton = panel.querySelector('#mad-scientist-id-btn');

  let next = FIRST_ID; // the first scientist not yet in the grid
  const tile = id => grid.querySelector(`[data-scientist="${id}"]`);

  /** Adds scientists to the grid, the next batch or up to (and past) `id`. */
  const renderMore = (id = null) => {
    if (next > LAST_ID || (id !== null && id < next)) return;
    const last = Math.min(LAST_ID, (id ?? next) + BATCH - 1);
    const chosen = current();
    const html = [];
    for (let n = next; n <= last; n++) {
      html.push(`<button type="button" class="mad-scientist-tile${n === chosen ? ' sui-mod-active' : ''}" data-scientist="${n}" title="Mad Scientist #${n}" aria-label="Mad Scientist #${n}"><img src="${scientistPath(n)}" alt="" loading="lazy"></button>`);
    }
    grid.insertAdjacentHTML('beforeend', html.join(''));
    next = last + 1;
  };

  // The endless scroll: nearing the end of the grid adds the next batch, until
  // the grid reaches past the bottom of the view.
  const fill = () => {
    while (next <= LAST_ID && scroller.clientHeight > 0 && scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - 600) {
      renderMore();
    }
  };
  scroller.addEventListener('scroll', fill, {passive: true});

  grid.addEventListener('click', event => {
    const target = event.target.closest('.mad-scientist-tile');
    if (target) pick(Number(target.dataset.scientist));
  });

  /** Brings a scientist into view, outlined. */
  const reveal = (id, {mark = true, smooth = true} = {}) => {
    renderMore(id);
    const target = tile(id);
    if (!target) return;
    if (mark) {
      grid.querySelectorAll('.mad-mod-found').forEach(found => found.classList.remove('mad-mod-found'));
      // Restarted, so finding the same scientist again plays the highlight again.
      void target.offsetWidth;
      target.classList.add('mad-mod-found');
    }
    target.scrollIntoView({block: 'center', behavior: smooth ? 'smooth' : 'auto'});
  };

  // Within a taller page (the profile), the gallery covers what is in view.
  const fit = () => {
    if (!viewport) return;
    viewport.scrollTop = 0;
    panel.style.bottom = 'auto';
    panel.style.height = `${Math.max(0, viewport.getBoundingClientRect().bottom - host.getBoundingClientRect().top)}px`;
  };

  const open = () => {
    panel.classList.remove('hidden');
    fit();
    const chosen = current();
    grid.querySelectorAll('.mad-scientist-tile.sui-mod-active').forEach(active => active.classList.remove('sui-mod-active'));
    if (chosen !== null) {
      renderMore(chosen);
      tile(chosen)?.classList.add('sui-mod-active');
      reveal(chosen, {mark: false, smooth: false});
    }
    fill();
    say('Pick your scientist, or find it by number.');
  };

  const close = () => panel.classList.add('hidden');

  const pick = id => {
    close();
    choose(id);
  };

  const find = () => {
    const id = parseId(idInput.value);
    if (id === null) return;
    reveal(id);
    fill();
    say(`There's #${id}. Click it to make it yours.`);
  };

  // Find is on only while the number is one it can find.
  idInput.addEventListener('input', () => {
    const found = parseId(idInput.value) !== null;
    idButton.disabled = !found;
    idButton.classList.toggle('sui-mod-primary', found);
    idButton.classList.toggle('sui-mod-disabled', !found);
  });
  idInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') find();
  });
  idButton.addEventListener('click', find);
  panel.querySelector('#mad-scientist-close').addEventListener('click', close);
  return {open, close};
}

/** The profile is confirmed: the picture can't change any more. */
function lock() {
  document.getElementById('mad-scientist-btn')?.remove();
  document.getElementById('mad-scientist-picker')?.remove();
}

// The player's own profile ---------------------------------------------------

const EDIT_ID = 'mad-profile-pfp-edit-btn';

/**
 * The edit button on the player's own portrait (AccountProfileViewModel).
 *
 * @param {object} viewModel AccountProfileViewModel
 * @return {string}
 */
function profileButtonHTML(viewModel) {
  return viewModel.isOwnProfile
    ? `<a id="${EDIT_ID}" class="mad-profile-pfp-edit" href="javascript: void(0)" title="Change picture" aria-label="Change picture">
        <i class="sui-icon icon-edit sui-text-secondary"></i>
      </a>`
    : '';
}

/**
 * Opens the gallery from the player's own profile; the scientist they choose is
 * set as their pfp on chain by their key at once (MsgPlayerUpdatePfp).
 *
 * @param {object} viewModel AccountProfileViewModel
 * @param {object} menuPage webapp's MenuPage
 */
function mountProfile(viewModel, menuPage) {
  const button = document.getElementById(EDIT_ID);
  const host = document.getElementById(menuPage.pageTemplateContentId);
  if (!button || !host) return;
  host.classList.add('mad-scientist-picker-host');

  const status = document.createElement('div');
  status.className = 'mad-profile-pfp-status sui-text-hint hidden';
  document.querySelector('.profile-header-info-container')?.append(status);
  const say = text => {
    status.textContent = text;
    status.classList.toggle('hidden', !text);
  };

  const picker = createPicker(host, {
    viewport: document.getElementById(menuPage.screenBodyId),
    current: () => chosenId({url: viewModel.player?.pfp}),
    say: () => {},
    choose: async id => {
      const {gameState, signingClientManager} = globalThis;
      const player = gameState?.keyPlayers?.player?.player;
      if (!player?.id || player.id !== viewModel.playerId || !signingClientManager) {
        say('Your picture can only be changed while you are signed in.');
        return;
      }
      const url = scientistUrl(id);
      button.classList.add('sui-mod-disabled');
      say(`Setting Mad Scientist #${id} as your picture…`);
      try {
        const tx = await signingClientManager.queueMsgPlayerUpdatePfp(player.id, url);
        if (tx?.status !== 'succeeded') throw new Error(tx?.error ?? tx?.status ?? 'not sent');
        player.pfp = url;
        player.pfp_client_render_attributes = attributes(url, player.pfp_client_render_attributes);
        // The HUD's portrait, and anything else showing the player's own.
        const event = new CustomEvent('RENDER_PLAYER_PFP');
        event.playerType = 'player';
        window.dispatchEvent(event);
        const portrait = document.querySelector('.profile-header-image');
        if (portrait) portrait.innerHTML = new PfpViewerComponent(player.pfp_client_render_attributes).renderHTML();
        say(`Mad Scientist #${id} is your picture.`);
      } catch (error) {
        console.warn(`[mad] pfp of ${player.id} not set: ${error?.message ?? error}`);
        say(`Your picture was not changed: ${error?.message ?? error}`);
      } finally {
        button.classList.remove('sui-mod-disabled');
      }
    },
  });
  button.addEventListener('click', () => {
    if (!button.classList.contains('sui-mod-disabled')) picker.open();
  });
}

export const scientists = Object.freeze({mount, lock, profileButtonHTML, mountProfile});

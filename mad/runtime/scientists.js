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
// with its warning and the close link.
import {FIRST_ID, LAST_ID, scientistId, scientistPath, scientistUrl} from './pfp.js';
import {bindSubmitButtonToInput} from '../../structs-webapp/src/js/util/SubmitButtonToggle.js';

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

  const panel = document.createElement('div');
  panel.id = 'mad-scientist-picker';
  panel.className = 'mad-scientist-picker hidden';
  panel.innerHTML = `
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
      <div class="common-inline-text-input-error-container">
        <div id="mad-scientist-id-error" class="sui-input-text-warning">Enter a number from ${FIRST_ID} to ${LAST_ID}.</div>
      </div>
    </div>
    <div id="mad-scientist-scroll" class="mad-scientist-scroll">
      <div id="mad-scientist-grid" class="mad-scientist-grid"></div>
    </div>`;
  body.append(panel);

  const scroller = panel.querySelector('#mad-scientist-scroll');
  const grid = panel.querySelector('#mad-scientist-grid');
  const idInput = panel.querySelector('#mad-scientist-id');
  const idButton = panel.querySelector('#mad-scientist-id-btn');
  const idError = panel.querySelector('#mad-scientist-id-error');

  let next = FIRST_ID; // the first scientist not yet in the grid
  const tile = id => grid.querySelector(`[data-scientist="${id}"]`);

  /** Adds scientists to the grid, the next batch or up to (and past) `id`. */
  const renderMore = (id = null) => {
    if (next > LAST_ID || (id !== null && id < next)) return;
    const last = Math.min(LAST_ID, (id ?? next) + BATCH - 1);
    const chosen = chosenId(viewModel.pfpViewerComponent?.pfp);
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
    if (target) choose(Number(target.dataset.scientist));
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

  const open = () => {
    panel.classList.remove('hidden');
    const chosen = chosenId(viewModel.pfpViewerComponent?.pfp);
    grid.querySelectorAll('.mad-scientist-tile.sui-mod-active').forEach(active => active.classList.remove('sui-mod-active'));
    if (chosen !== null) {
      renderMore(chosen);
      tile(chosen)?.classList.add('sui-mod-active');
      reveal(chosen, {mark: false, smooth: false});
    }
    fill();
    menuPage.setDialogueScreenContent(`Pick your scientist. Know its number? Find it.`, true);
  };

  const close = () => panel.classList.add('hidden');

  const choose = id => {
    const component = viewModel.pfpViewerComponent;
    // The generated layers stay, under the scientist, for clients that don't show URLs.
    component.pfp = {...(component.pfp ?? {}), url: scientistUrl(id)};
    component.render();
    viewModel.gameState.signupRequest.pfp_client_render_attributes = component.getPfpJson();
    close();
    menuPage.setDialogueScreenContent(`Mad Scientist #${id} it is. Now, your display name.`, true);
  };

  const find = () => {
    const id = parseId(idInput.value);
    if (id === null) {
      idError.classList.add('sui-mod-show');
      return;
    }
    idError.classList.remove('sui-mod-show');
    reveal(id);
    fill();
    menuPage.setDialogueScreenContent(`There's #${id}. Click it to make it yours.`, true);
  };

  bindSubmitButtonToInput(idInput, () => idButton);
  idInput.addEventListener('input', () => idError.classList.remove('sui-mod-show'));
  idInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') find();
  });
  idButton.addEventListener('click', find);
  panel.querySelector('#mad-scientist-close').addEventListener('click', close);
  button.addEventListener('click', open);
}

/** The profile is confirmed: the picture can't change any more. */
function lock() {
  document.getElementById('mad-scientist-btn')?.remove();
  document.getElementById('mad-scientist-picker')?.remove();
}

export const scientists = Object.freeze({mount, lock});

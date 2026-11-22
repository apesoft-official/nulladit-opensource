import { generateIdentity } from './crypto.js';
import { NulladitClient } from './api.js';
import {
  saveIdentity,
  loadIdentity
} from './key-storage.js';

// Configured by the operator at build time.
// Never accept an arbitrary messaging node from user input.
const NODE_URL = (
  import.meta.env.VITE_NULLADIT_NODE_URL || ''
).trim();

function trustedNode() {
  if (!NODE_URL) return false;

  try {
    const url = new URL(NODE_URL);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash;
  } catch {
    return false;
  }
}

export function attachPreviewSetup() {
  const target = document.querySelector('.sidebar-bottom');
  if (!target) throw new Error('Setup target missing');

  const ready = trustedNode();

  const panel = document.createElement('section');
  panel.className = 'preview-setup';

  panel.innerHTML = `
    <div class="preview-setup-heading">
      <span>✦ TEMPORARY MESSENGER</span>
      <span class="preview-setup-state">
        ${ready ? 'EXPERIMENTAL' : 'SETUP'}
      </span>
    </div>

    <p class="preview-setup-description">
      Invitation-only encrypted messenger preview.
      Decentralized network not live.
    </p>

    <form id="nulladit-registration" autocomplete="off">
      <label for="nulladit-node">TEMPORARY NODE</label>
      <input id="nulladit-node" type="text"
        value="${ready ? 'PROTECTED HTTPS NODE CONFIGURED' : 'NOT CONFIGURED'}"
        disabled>

      <label for="nulladit-identity">YOUR USERNAME</label>
      <input id="nulladit-identity"
        minlength="3" maxlength="32"
        pattern="[A-Za-z0-9_-]{3,32}"
        autocomplete="off"
        placeholder="Choose a username" required>

      <label for="nulladit-invitation">INVITATION CODE</label>
      <input id="nulladit-invitation"
        type="password" minlength="64" maxlength="64"
        autocomplete="off"
        placeholder="Private invitation code" required>

      <button type="submit" ${ready ? '' : 'disabled'}>
        ${ready ? 'REGISTER PREVIEW ACCOUNT' : 'AWAITING SECURE NODE'}
      </button>
    </form>

    <p class="preview-setup-warning">
      ⚠ Experimental software. No verified production E2E
      security or account recovery. Do not use for
      sensitive communications.
    </p>

    <p id="nulladit-setup-feedback" role="status"
      aria-live="polite">
      ${ready
        ? 'Ready for invitation-only preview registration.'
        : 'Awaiting protected HTTPS node configuration.'}
    </p>
  `;

  target.prepend(panel);

  const form = panel.querySelector('#nulladit-registration');
  const feedback = panel.querySelector('#nulladit-setup-feedback');
  const button = form.querySelector('button');
  const invitationInput = panel.querySelector('#nulladit-invitation');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || button.disabled) return;

    const identity = panel.querySelector(
      '#nulladit-identity'
    ).value.trim();

    const invitation = invitationInput.value;
    invitationInput.value = '';

    button.disabled = true;
    feedback.textContent = 'Preparing local cryptographic identity...';

    try {
      // A registration retry must reuse previously saved keys.
      let record = await loadIdentity(identity);

      if (!record) {
        const keys = await generateIdentity();
        await saveIdentity(identity, keys);
        record = await loadIdentity(identity);
      }

      if (!record?.keys) {
        throw new Error('Local identity storage unavailable');
      }

      const client = new NulladitClient(
        NODE_URL, identity, record.keys
      );

      feedback.textContent =
        'Submitting signed invitation registration...';

      const result = await client.register(invitation);

      if (!result.registered ||
          result.identity !== identity) {
        throw new Error('Registration was not confirmed');
      }

      feedback.textContent =
        'Registration confirmed. Local keys preserved. ' +
        'Messaging will be enabled after additional security checks.';

    } catch (error) {
      feedback.textContent =
        'Registration not confirmed. Local keys were retained ' +
        'for recovery or retry. Check your invitation and node status.';
    } finally {
      button.disabled = false;
    }
  });
}

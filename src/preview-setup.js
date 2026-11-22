/*
 * NULLADIT public experimental preview setup.
 * UI only. Network registration is deliberately disabled until
 * the private gateway has been secured and verified.
 */

export function attachPreviewSetup() {
  const target = document.querySelector('.sidebar-bottom');
  if (!target) throw new Error('Sidebar setup target missing');

  const panel = document.createElement('section');
  panel.className = 'preview-setup';

  panel.innerHTML = `
    <div class="preview-setup-heading">
      <span>✦ TEMPORARY MESSENGER</span>
      <span class="preview-setup-state">SETUP</span>
    </div>

    <p class="preview-setup-description">
      Invitation-only encrypted messaging preview.
      The decentralized network is not live.
    </p>

    <form id="nulladit-registration" autocomplete="off">
      <label for="nulladit-node">TEMPORARY NODE</label>
      <input
        id="nulladit-node"
        type="url"
        placeholder="https://node.example.com"
        spellcheck="false"
        required
      >

      <label for="nulladit-identity">YOUR USERNAME</label>
      <input
        id="nulladit-identity"
        type="text"
        minlength="3"
        maxlength="32"
        pattern="[A-Za-z0-9_-]{3,32}"
        placeholder="Choose a username"
        autocomplete="off"
        required
      >

      <label for="nulladit-invitation">INVITATION CODE</label>
      <input
        id="nulladit-invitation"
        type="password"
        minlength="64"
        maxlength="64"
        placeholder="Private invitation code"
        autocomplete="off"
        required
      >

      <button type="submit" disabled>
        REGISTRATION NOT YET ENABLED
      </button>
    </form>

    <p class="preview-setup-warning">
      ⚠ Experimental software. Do not use for sensitive
      communications. Browser key recovery is not available.
    </p>

    <p id="nulladit-setup-feedback" role="status">
      Awaiting protected node configuration.
    </p>
  `;

  target.prepend(panel);

  panel.querySelector('#nulladit-registration')
    .addEventListener('submit', event => {
      event.preventDefault();
    });
}

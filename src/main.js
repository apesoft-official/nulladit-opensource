import './style.css';
import { attachPreviewSetup } from './preview-setup.js';

const conversations = [
  {
    id: 'north',
    name: 'Northern Lights',
    avatar: '🌲',
    preview: 'The mountains look incredible tonight.',
    messages: [
      { from: 'them', text: 'Hey! Made it up to the cabin.' },
      { from: 'me', text: 'How is it out there?' },
      { from: 'them', text: 'The mountains look incredible tonight.' },
      { from: 'me', text: 'Save me a spot by the fire. 🍁' }
    ]
  },
  {
    id: 'maple',
    name: 'Maple Trail',
    avatar: '🍁',
    preview: 'See you on the trail!',
    messages: [
      { from: 'them', text: 'Are we still hiking this weekend?' },
      { from: 'me', text: 'Absolutely. See you on the trail!' }
    ]
  },
  {
    id: 'loon',
    name: 'Loon Lake',
    avatar: '🌙',
    preview: 'The lake is perfectly still.',
    messages: [
      { from: 'them', text: 'The lake is perfectly still.' }
    ]
  }
];

let active = conversations[0];
let mobileChat = false;

const escapeHTML = (value) => String(value).replace(
  /[&<>"']/g,
  (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[char]
);

function render() {
  document.querySelector('#app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar ${mobileChat ? 'mobile-hidden' : ''}">
        <div class="brand">
          <div class="brand-icon">🍁</div>
          <div>
            <div class="brand-name">NULLADIT</div>
            <div class="brand-tag">INVIOLABLE CONVERSATIONS</div>
          </div>
        </div>

        <div class="sidebar-title">
          <span>CONVERSATIONS</span>
          <span class="count">03</span>
        </div>

        <div class="conversation-list">
          ${conversations.map((c) => `
            <button class="conversation ${active.id === c.id ? 'selected' : ''}"
              data-conversation="${c.id}">
              <span class="avatar">${c.avatar}</span>
              <span class="conversation-details">
                <strong>${escapeHTML(c.name)}</strong>
                <small>${escapeHTML(c.preview)}</small>
              </span>
            </button>
          `).join('')}
        </div>

        <div class="sidebar-bottom">
          <div class="connection-status">
            <span class="offline-dot"></span>
            TEMPORARY NODE: NOT CONNECTED
          </div>
          <p>DEMO MODE · SAMPLE DATA</p>
          <button class="theme-button" type="button">🍁 CANADIAN WILDERNESS</button>
        </div>
      </aside>

      <main class="main-panel ${mobileChat ? 'mobile-open' : ''}">
        <header class="chat-header">
          <button id="back" aria-label="Back to conversations">←</button>
          <span class="avatar">${active.avatar}</span>
          <div class="header-person">
            <strong>${escapeHTML(active.name)}</strong>
            <small>DEMONSTRATION CONVERSATION</small>
          </div>
          <span class="header-symbol">✦</span>
        </header>

        <div class="landscape" aria-label="Pixel-inspired Canadian mountain landscape">
          <div class="stars">✦　·　✧　　✦　·　　✧</div>
          <div class="moon"></div>
          <div class="mountain mountain-far"></div>
          <div class="mountain mountain-near"></div>
          <div class="forest forest-left">♠ ♠ ♠</div>
          <div class="forest forest-right">♠ ♠ ♠</div>
          <div class="landscape-caption">THE GREAT CANADIAN OUTDOORS</div>
        </div>

        <div class="messages" id="messages">
          <div class="day-separator">TODAY · SAMPLE CHAT</div>
          ${active.messages.map((m) => `
            <div class="message ${m.from === 'me' ? 'mine' : 'theirs'}">
              <div class="bubble">${escapeHTML(m.text)}</div>
              <small>${m.from === 'me' ? 'YOU' : escapeHTML(active.name.toUpperCase())} · DEMO</small>
            </div>
          `).join('')}
        </div>

        <div class="compose-area">
          <form id="compose">
            <input id="message-input"
              placeholder="Messaging unavailable in demo mode"
              aria-label="Message input"
              maxlength="2000" disabled>
            <button type="submit" disabled>SEND ➤</button>
          </form>
          <p class="compose-note">⚠ PREVIEW ONLY — NO LIVE MESSAGE DELIVERY OR VERIFIED E2E SECURITY</p>
        </div>
      </main>
    </div>
    <div class="preview-banner">
      NULLADIT EXPERIMENTAL PREVIEW — DECENTRALIZED NETWORK NOT LIVE.
      DO NOT USE FOR SENSITIVE COMMUNICATIONS.
    </div>
  `;

  document.querySelectorAll('[data-conversation]').forEach((button) => {
    button.addEventListener('click', () => {
      active = conversations.find(
        (c) => c.id === button.dataset.conversation
      );
      mobileChat = true;
      render();
    });
  });

  document.querySelector('#back').addEventListener('click', () => {
    mobileChat = false;
    render();
  });

  document.querySelector('#compose').addEventListener(
    'submit', (event) => event.preventDefault()
  );

  attachPreviewSetup();

  const messages = document.querySelector('#messages');
  messages.scrollTop = messages.scrollHeight;
}

render();

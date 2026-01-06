/**
 * DOM Fixture Helper for popup.js testing
 * Creates a minimal but complete DOM structure based on popup.html
 */

function createPopupDOM() {
  // Create main container
  const container = document.createElement('div');
  container.className = 'mx-4 mt-4 mb-3 w-100';
  
  // Create header with search input
  const header = document.createElement('header');
  header.className = 'd-flex align-items-center border-bottom pb-4';
  header.innerHTML = `
    <div class="input-group">
      <div class="input-group-prepend">
        <span class="input-group-text brand"><img src="images/icon-32.png" alt="badge" /></span>
      </div>
      <input type="text" class="form-control ps-2 pe-5" autocomplete="off" 
             placeholder="Search Google Maps" id="searchInput" />
      <button id="enterButton" 
              class="input-group-text btn-enter justify-content-center rounded-circle border-0 d-none"
              title="Search">
        <i class="bi bi-arrow-right"></i>
      </button>
    </div>
  `;
  
  // Create main section
  const section = document.createElement('section');
  section.className = 'pt-3 pb-4';
  section.innerHTML = `
    <div class="container mb-3">
      <div class="row justify-content-between">
        <div class="col-auto d-flex align-items-center px-0">
          <h6 id="subtitle" class="my-0 ticket-box" data-locale="searchHistorySubtitle">Search History</h6>
        </div>
        <div class="col-auto ml-auto d-flex align-items-center px-0">
          <div class="row g-1">
            <div class="col">
              <button type="button" id="videoSummaryButton" class="btn btn-outline-secondary d-none"
                      aria-label="Video Summary" title="Video Summary">
                <i class="bi bi-youtube"></i>
              </button>
            </div>
            <div class="col">
              <button type="button" id="geminiSummaryButton" class="btn btn-outline-secondary"
                      aria-label="Gemini Summary" title="Gemini Summary">
                <i class="bi bi-stars"></i>
              </button>
            </div>
            <div class="col">
              <button type="button" id="searchHistoryButton"
                      class="btn btn-outline-secondary active-button" aria-label="Search History"
                      title="Search History">
                <i class="bi bi-clock-fill"></i>
              </button>
            </div>
            <div class="col">
              <button type="button" id="favoriteListButton" class="btn btn-outline-secondary"
                      aria-label="Favorite List" title="Favorite List">
                <i class="bi bi-patch-check-fill"></i>
              </button>
            </div>
            <div class="col">
              <button type="button" id="deleteListButton" class="btn btn-outline-secondary"
                      aria-label="Delete List" title="Delete Mode">
                <i class="bi bi-trash-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p id="emptyMessage" class="text-muted text-center py-4 page-H" data-locale="historyEmptyMsg">No search history yet</p>
    <p id="favoriteEmptyMessage" class="text-muted text-center py-4 page-F" data-locale="favoriteEmptyMsg">No favorites yet</p>
    <p id="geminiEmptyMessage" class="text-muted text-center py-4 page-G" data-locale="geminiEmptyMsg">No summary yet</p>
    <div id="searchHistoryList" class="overflow-auto mb-4 page-H"></div>
    <div id="favoriteList" class="overflow-auto mb-4 page-F d-none"></div>
    <div id="geminiResponse" class="d-none page-G">
      <textarea class="w-100 d-none" id="response" style="height: 200px" aria-label="Testing Purpose"></textarea>
      <div id="summaryList" class="overflow-auto mb-4"></div>
    </div>
    <div id="searchButtonGroup" class="d-flex justify-content-evenly mt-3 page-H">
      <button id="clearButton" class="btn btn-light me-3 w-25">
        <i class="bi bi-trash-fill me-2"></i><span data-locale="clearBtnText">Clear</span>
      </button>
      <a id="mapsButton" href="#" target="_blank" class="btn btn-primary btn-maps flex-fill">
        <i class="bi bi-geo-alt-fill me-2"></i><span id="mapsButtonSpan" data-locale="mapsBtnText">Open Maps</span>
      </a>
    </div>
    <div id="deleteButtonGroup" class="d-flex justify-content-evenly mt-3 d-none page-D">
      <button id="cancelButton" class="btn btn-light me-3 w-25">
        <span data-locale="cancelBtnText">Cancel</span>
      </button>
      <a id="deleteButton" class="btn btn-danger btn-delete flex-fill">
        <i class="bi bi-trash-fill me-2"></i><span></span>
      </a>
    </div>
    <div id="exportButtonGroup" class="d-flex justify-content-evenly mt-3 d-none page-F">
      <button id="exportButton" class="btn btn-light me-3 w-50">
        <i class="bi bi-download me-2"></i><span data-locale="exportBtnText">Export</span>
      </button>
      <button id="importButton" class="btn btn-light w-50">
        <i class="bi bi-upload me-2"></i><span data-locale="importBtnText">Import</span>
      </button>
      <input type="file" id="fileInput" style="display: none" accept=".csv" aria-label="Import" />
    </div>
    <div id="geminiButtonGroup" class="d-flex justify-content-evenly mt-3 d-none page-G">
      <button id="apiButton" class="btn btn-light me-3 w-25" data-bs-toggle="modal" data-bs-target="#apiModal">
        <i class="bi bi-code-slash me-2"></i><span data-locale="apiBtnText">API</span>
      </button>
      <button id="clearButtonSummary" class="btn btn-light me-3 w-25 d-none">
        <i class="bi bi-trash-fill me-2"></i><span data-locale="clearBtnText">Clear</span>
      </button>
      <button id="sendButton" class="btn btn-send flex-fill">
        <i class="bi bi-stars me-2"></i><span data-locale="sendBtnText">Send</span>
      </button>
    </div>
  `;
  
  // Create footer
  const footer = document.createElement('footer');
  footer.innerHTML = `
    <ul class="nav justify-content-center border-top">
      <li class="nav-item footer-li">
        <a href="https://bento.me/the-maps-express" target="_blank" class="nav-link text-muted" data-locale="aboutBtnText">About</a>
      </li>
      <li class="nav-item footer-li" data-bs-toggle="modal" data-bs-target="#tipsModal">
        <span class="nav-link text-muted" data-locale="tipsBtnText">Tips</span>
      </li>
      <li class="nav-item footer-li" data-bs-toggle="modal" data-bs-target="#premiumModal">
        <span class="nav-link text-muted" data-locale="premiumBtnText">Premium</span>
      </li>
      <li class="nav-item footer-li" data-bs-toggle="modal" data-bs-target="#optionalModal" id="optionalButton">
        <span class="nav-link text-muted" data-locale="optionalBtnText">Settings</span>
      </li>
    </ul>
  `;
  
  // Create modals
  const modals = document.createElement('div');
  modals.innerHTML = `
    <div class="modal fade" id="tipsModal" tabindex="-1" aria-label="Tips Modal">
      <div class="modal-dialog modal-dialog-centered modal-xs">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-6" id="tipsModalLabel" data-locale="shortcutsTitle">Keyboard Shortcuts</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="premium-only" data-locale="shortcutsNote">Configure shortcuts</p>
            <p class="premium-only" data-locale="shortcutsNote">Configure shortcuts</p>
            <p class="premium-only" data-locale="shortcutsNote">Configure shortcuts</p>
          </div>
        </div>
      </div>
    </div>
    <div class="modal fade" id="premiumModal" tabindex="-1" aria-label="Premium Modal">
      <div class="modal-dialog modal-dialog-centered modal-xs">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-6" id="premiumModalLabel" data-locale="premiumTitle">Premium Features</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body d-flex flex-column">
            <button id="paymentButton" class="btn btn-send flex-fill my-3">
              <span data-locale="paymentLabel">Purchase</span>
            </button>
            <button id="restoreButton" class="btn btn-light flex-fill mb-3">
              <span data-locale="restoreLabel">Restore</span>
            </button>
          </div>
          <div class="modal-footer d-flex justify-content-start">
            <p class="text-muted" data-locale="premiumNote">Premium note</p>
          </div>
        </div>
      </div>
    </div>
    <div class="modal fade" id="optionalModal" tabindex="-1" aria-label="Optional Modal">
      <div class="modal-dialog modal-dialog-centered modal-xs">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-6" id="optionalModalLabel" data-locale="optionalTitle">Optional Settings</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="dirForm" class="my-3">
              <div class="d-flex mb-3 position-relative">
                <input type="text" class="form-control py-2 pe-5 modalFormInput" autocomplete="off" id="dirInput" />
                <button type="submit" data-bs-dismiss="modal" title="Save Directory"
                        class="btn btn-set d-flex align-items-center justify-content-center rounded-circle border-0">
                  <i class="bi bi-arrow-right"></i>
                </button>
              </div>
            </form>
            <form id="authUserForm" class="settings-item">
              <div class="settings-item-info">
                <label for="authUserInput" class="settings-item-label">Google Account</label>
                <span class="settings-item-desc">Account index to use</span>
              </div>
              <div class="d-flex position-relative mt-2">
                <input type="text" class="form-control py-2 pe-5 modalFormInput" autocomplete="off" id="authUserInput" />
                <button type="submit" data-bs-dismiss="modal" title="Save Authuser"
                        class="btn btn-set d-flex align-items-center justify-content-center rounded-circle border-0">
                  <i class="bi bi-arrow-right"></i>
                </button>
              </div>
            </form>
            <form id="historyMaxForm" class="settings-item">
              <div class="settings-item-info">
                <label for="historyMaxInput" class="settings-item-label">History Limit</label>
                <span class="settings-item-desc">Maximum number of history items (1-100)</span>
              </div>
              <div class="d-flex position-relative mt-2">
                <input type="number" class="form-control py-2 pe-5 modalFormInput" autocomplete="off" id="historyMaxInput" min="1" max="100" />
                <button type="submit" data-bs-dismiss="modal" title="Save History Max"
                        class="btn btn-set d-flex align-items-center justify-content-center rounded-circle border-0">
                  <i class="bi bi-arrow-right"></i>
                </button>
              </div>
            </form>
            <div class="settings-item settings-toggle-item" id="incognitoToggle">
              <div class="settings-item-info">
                <span class="settings-item-label">Incognito Mode</span>
                <span class="settings-item-desc">History won't be saved</span>
              </div>
              <div class="settings-toggle">
                <div class="toggle-switch">
                  <div class="toggle-knob"></div>
                </div>
              </div>
            </div>
            <div class="settings-item settings-toggle-item" id="darkModeToggle">
              <div class="settings-item-info">
                <span class="settings-item-label">Dark Mode</span>
                <span class="settings-item-desc">Apply dark theme</span>
              </div>
              <div class="settings-toggle">
                <div class="toggle-switch">
                  <div class="toggle-knob"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal fade" id="apiModal" tabindex="-1" aria-label="API Modal">
      <div class="modal-dialog modal-dialog-centered modal-xs">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-6" id="apiModalLabel" data-locale="apiTitle">API Settings</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="apiForm" class="d-flex my-3">
              <input type="text" class="form-control py-2 pe-5" autocomplete="off" id="apiInput" />
              <button type="submit" data-bs-dismiss="modal" title="Save"
                      class="btn btn-setAPI d-flex align-items-center justify-content-center rounded-circle border-0">
                <i class="bi bi-arrow-right"></i>
              </button>
            </form>
          </div>
          <div class="modal-footer d-flex justify-content-start">
            <p class="text-muted" data-locale="apiNote">Get your API key</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Assemble everything
  container.appendChild(header);
  container.appendChild(section);
  container.appendChild(footer);
  container.appendChild(modals);
  
  return container;
}

/**
 * Initialize the complete popup DOM in the document body
 */
function setupPopupDOM() {
  // Clear existing body content
  document.body.innerHTML = '';
  
  // Add popup DOM to body
  const popupDOM = createPopupDOM();
  document.body.appendChild(popupDOM);
  
  // Set body dimensions for measurement tests
  Object.defineProperty(document.body, 'offsetWidth', {
    configurable: true,
    value: 400
  });
  
  Object.defineProperty(document.body, 'offsetHeight', {
    configurable: true,
    value: 600
  });
}

/**
 * Clean up DOM after test
 */
function teardownPopupDOM() {
  document.body.innerHTML = '';
}

module.exports = {
  createPopupDOM,
  setupPopupDOM,
  teardownPopupDOM
};

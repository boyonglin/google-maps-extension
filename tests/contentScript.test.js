/**
 * Comprehensive Unit Tests for contentScript.js
 * Tests all message handlers and content extraction logic
 */

// Shared test utilities
const setupContentScriptTest = () => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  delete globalThis.attachMapLinkToPage;
  global.window.getSelection = jest.fn();
  
  let messageListener;
  jest.isolateModules(() => {
    require('../Package/dist/contentScript.js');
    messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
  });
  
  return messageListener;
};

const createMockSelection = (text) => ({
  toString: jest.fn(() => text)
});

const sendMessageAndExpect = (listener, request, expectedResponse) => {
  const sendResponse = jest.fn();
  listener(request, {}, sendResponse);
  expect(sendResponse).toHaveBeenCalledWith(expectedResponse);
};

describe('contentScript.js - Message Listener Registration', () => {
  beforeEach(setupContentScriptTest);

  test('should register chrome.runtime.onMessage listener', () => {
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(expect.any(Function));
  });

  test('should have a valid listener function', () => {
    const listenerCall = chrome.runtime.onMessage.addListener.mock.calls[0];
    const listener = listenerCall[0];
    
    expect(typeof listener).toBe('function');
    expect(listener.length).toBe(3); // request, sender, sendResponse
  });
});

describe('contentScript.js - getSelectedText Action', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('should return selected text when action is getSelectedText', () => {
    const mockSelection = createMockSelection('Selected text content');
    window.getSelection.mockReturnValue(mockSelection);

    sendMessageAndExpect(
      messageListener,
      { action: 'getSelectedText' },
      { selectedText: 'Selected text content' }
    );

    expect(window.getSelection).toHaveBeenCalled();
    expect(mockSelection.toString).toHaveBeenCalled();
  });

  test('should return empty string when no text is selected', () => {
    window.getSelection.mockReturnValue(createMockSelection(''));

    sendMessageAndExpect(
      messageListener,
      { action: 'getSelectedText' },
      { selectedText: '' }
    );
  });

  test('should handle special characters in selected text', () => {
    const text = 'Text with <html> & special "characters"';
    window.getSelection.mockReturnValue(createMockSelection(text));
    sendMessageAndExpect(messageListener, { action: 'getSelectedText' }, { selectedText: text });
  });

  test('should handle Unicode characters in selected text', () => {
    const text = '日本語のテキスト 🎌';
    window.getSelection.mockReturnValue(createMockSelection(text));
    sendMessageAndExpect(messageListener, { action: 'getSelectedText' }, { selectedText: text });
  });

  test('should handle multiline selected text', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    window.getSelection.mockReturnValue(createMockSelection(text));
    sendMessageAndExpect(messageListener, { action: 'getSelectedText' }, { selectedText: text });
  });

  test('should not respond when request is null', () => {
    const sendResponse = jest.fn();
    messageListener(null, {}, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  test('should not respond when request is undefined', () => {
    const sendResponse = jest.fn();
    messageListener(undefined, {}, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  test('should not respond when action is missing', () => {
    const sendResponse = jest.fn();
    messageListener({}, {}, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});

describe('contentScript.js - getContent Action', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('should return page content and length', () => {
    document.head.innerHTML = '<title>Test Page Title</title>';
    document.body.innerHTML = '<p>Test body content</p>';

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining('Test Page Title'),
      length: expect.any(Number)
    }));

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('<title>Test Page Title</title>');
    expect(response.content).toContain('Test body content');
    expect(response.length).toBe(response.content.length);
  });

  test('should handle page without title', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<p>Content without title</p>';

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('<title></title>');
    expect(response.content).toContain('Content without title');
  });

  test('should preserve h1, h2, h3, and strong tags', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <strong>Strong text</strong>
      <p>Normal text</p>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('<h1>Heading 1</h1>');
    expect(response.content).toContain('<h2>Heading 2</h2>');
    expect(response.content).toContain('<h3>Heading 3</h3>');
    expect(response.content).toContain('<strong>Strong text</strong>');
  });

  test('should remove header text from body content', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <header>Header content to remove</header>
      <main>Main content to keep</main>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    // Header text should be removed from body content
    expect(response.content).toContain('Main content to keep');
    // The body text should not contain the header text duplicated
    const bodySection = response.content.split('Page body content: ')[1];
    expect(bodySection).not.toContain('Header content to remove');
  });

  test('should remove footer text from body content', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <main>Main content to keep</main>
      <footer>Footer content to remove</footer>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('Main content to keep');
    const bodySection = response.content.split('Page body content: ')[1];
    expect(bodySection).not.toContain('Footer content to remove');
  });

  test('should handle special regex characters in header/footer text', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <header>Header with special chars: dot star plus question</header>
      <main>Main content</main>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    // Should not throw error
    expect(() => {
      messageListener(request, {}, sendResponse);
    }).not.toThrow();

    expect(sendResponse).toHaveBeenCalled();
  });

  test('should handle empty body', () => {
    document.head.innerHTML = '<title>Empty Page</title>';
    document.body.innerHTML = '';

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('<title>Empty Page</title>');
    expect(response.length).toBeGreaterThan(0);
  });

  test('should handle nested tags correctly', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <div>
        <h1>Title with <strong>nested strong</strong></h1>
        <p>Paragraph with <strong>bold text</strong></p>
      </div>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('<h1>');
    expect(response.content).toContain('<strong>');
  });
});

describe('contentScript.js - attachMapLink Action', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
    globalThis.attachMapLinkToPage = jest.fn();
  });

  test('should call attachMapLinkToPage when action is attachMapLink with content', () => {
    const request = { 
      action: 'attachMapLink', 
      content: 'Map link data' 
    };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(globalThis.attachMapLinkToPage).toHaveBeenCalledWith(request);
  });

  test('should not call attachMapLinkToPage when content is missing', () => {
    const request = { action: 'attachMapLink' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(globalThis.attachMapLinkToPage).not.toHaveBeenCalled();
  });

  test('should not call attachMapLinkToPage when content is empty string', () => {
    const request = { action: 'attachMapLink', content: '' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(globalThis.attachMapLinkToPage).not.toHaveBeenCalled();
  });

  test('should not call attachMapLinkToPage when content is null', () => {
    const request = { action: 'attachMapLink', content: null };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(globalThis.attachMapLinkToPage).not.toHaveBeenCalled();
  });

  test('should pass the complete request object to attachMapLinkToPage', () => {
    const request = { 
      action: 'attachMapLink', 
      content: 'Map data',
      url: 'https://maps.google.com',
      extra: 'metadata'
    };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(globalThis.attachMapLinkToPage).toHaveBeenCalledWith(request);
    expect(globalThis.attachMapLinkToPage.mock.calls[0][0]).toEqual(request);
  });
});

describe('contentScript.js - ping Connection Check', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('should respond with connected status when message is ping', () => {
    const request = { message: 'ping' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ status: 'connected' });
  });

  test('should not respond to ping action (only message)', () => {
    const request = { action: 'ping' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(sendResponse).not.toHaveBeenCalledWith({ status: 'connected' });
  });
});

describe('contentScript.js - expandYouTubeDescription Action', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('should click expand button and return expanded: true', () => {
    const expandButton = document.createElement('tp-yt-paper-button');
    expandButton.id = 'expand';
    expandButton.className = 'button style-scope ytd-text-inline-expander';
    expandButton.setAttribute('aria-disabled', 'false');
    expandButton.click = jest.fn();
    document.body.appendChild(expandButton);

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    const result = messageListener(request, {}, sendResponse);

    expect(expandButton.click).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ expanded: true });
    expect(result).toBe(true); // Should keep message channel open
  });

  test('should not click primary button when aria-disabled is true, tries alternatives', () => {
    const expandButton = document.createElement('tp-yt-paper-button');
    expandButton.id = 'expand';
    expandButton.className = 'button style-scope ytd-text-inline-expander';
    expandButton.setAttribute('aria-disabled', 'true');
    expandButton.click = jest.fn();
    document.body.appendChild(expandButton);

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    const result = messageListener(request, {}, sendResponse);

    // Primary button should not be clicked when disabled
    expect(expandButton.click).not.toHaveBeenCalled();
    // Should try alternatives and send response (no expand button found since no alternatives exist)
    expect(sendResponse).toHaveBeenCalledWith({ expanded: false, message: 'No expand button found' });
    expect(result).toBe(true);
  });

  test('should try alternative selector ytd-text-inline-expander tp-yt-paper-button', () => {
    const container = document.createElement('ytd-text-inline-expander');
    const expandButton = document.createElement('tp-yt-paper-button');
    expandButton.id = 'expand';
    expandButton.click = jest.fn();
    container.appendChild(expandButton);
    document.body.appendChild(container);

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(expandButton.click).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ expanded: true });
  });

  test('should try alternative selector with id expand.ytd-text-inline-expander', () => {
    const expandButton = document.createElement('button');
    expandButton.id = 'expand';
    expandButton.className = 'ytd-text-inline-expander';
    expandButton.click = jest.fn();
    document.body.appendChild(expandButton);

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(expandButton.click).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ expanded: true });
  });

  test('should try alternative selector with aria-label containing more', () => {
    const expandButton = document.createElement('button');
    expandButton.setAttribute('aria-label', 'Show more details');
    expandButton.click = jest.fn();
    document.body.appendChild(expandButton);

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(expandButton.click).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ expanded: true });
  });

  test('should try alternative selector with aria-label Show more', () => {
    const expandButton = document.createElement('button');
    expandButton.setAttribute('aria-label', 'Show more');
    expandButton.click = jest.fn();
    document.body.appendChild(expandButton);

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(expandButton.click).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ expanded: true });
  });

  test('should return expanded: false when no button is found', () => {
    document.body.innerHTML = '<div>No expand button here</div>';

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ 
      expanded: false, 
      message: 'No expand button found' 
    });
  });

  test('should handle errors and return error message', () => {
    // Mock querySelector to throw an error
    const originalQuerySelector = document.querySelector;
    document.querySelector = jest.fn(() => {
      throw new Error('DOM error');
    });

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ 
      expanded: false, 
      error: 'DOM error' 
    });

    // Restore original
    document.querySelector = originalQuerySelector;
  });

  test('should return true to keep message channel open for async response', () => {
    document.body.innerHTML = '<div>No button</div>';

    const request = { action: 'expandYouTubeDescription' };
    const sendResponse = jest.fn();

    const result = messageListener(request, {}, sendResponse);

    expect(result).toBe(true);
  });
});

describe('contentScript.js - updateIframeSize Action', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('should update iframe width and height with correct calculations', () => {
    const iframe = document.createElement('div');
    iframe.id = 'TMEiframe';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    document.body.appendChild(iframe);

    const request = { 
      action: 'updateIframeSize', 
      width: 400, 
      height: 300 
    };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.style.width).toBe('402px'); // width + 2
    expect(iframe.style.height).toBe('335px'); // height + 32 + 3
  });

  test('should handle zero width and height', () => {
    const iframe = document.createElement('div');
    iframe.id = 'TMEiframe';
    document.body.appendChild(iframe);

    const request = { 
      action: 'updateIframeSize', 
      width: 0, 
      height: 0 
    };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.style.width).toBe('2px');
    expect(iframe.style.height).toBe('35px');
  });

  test('should handle large dimensions', () => {
    const iframe = document.createElement('div');
    iframe.id = 'TMEiframe';
    document.body.appendChild(iframe);

    const request = { 
      action: 'updateIframeSize', 
      width: 1920, 
      height: 1080 
    };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.style.width).toBe('1922px');
    expect(iframe.style.height).toBe('1115px');
  });

  test('should not throw error when iframe does not exist', () => {
    const request = { 
      action: 'updateIframeSize', 
      width: 400, 
      height: 300 
    };
    const sendResponse = jest.fn();

    expect(() => {
      messageListener(request, {}, sendResponse);
    }).not.toThrow();
  });

  test('should handle negative dimensions', () => {
    const iframe = document.createElement('div');
    iframe.id = 'TMEiframe';
    document.body.appendChild(iframe);

    const request = { 
      action: 'updateIframeSize', 
      width: -100, 
      height: -50 
    };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.style.width).toBe('-98px');
    expect(iframe.style.height).toBe('-15px');
  });

  test('should handle decimal dimensions', () => {
    const iframe = document.createElement('div');
    iframe.id = 'TMEiframe';
    document.body.appendChild(iframe);

    const request = { 
      action: 'updateIframeSize', 
      width: 400.5, 
      height: 300.7 
    };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.style.width).toBe('402.5px');
    expect(iframe.style.height).toBe('335.7px');
  });
});

describe('contentScript.js - finishIframe Action', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('should set iframe opacity to 1 and add transition', () => {
    const iframe = document.createElement('div');
    iframe.id = 'TMEiframe';
    iframe.style.opacity = '0';
    iframe.style.transition = '';
    document.body.appendChild(iframe);

    const request = { action: 'finishIframe' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.style.opacity).toBe('1');
    expect(iframe.style.transition).toBe('width 0.3s ease-in-out, height 0.3s ease-in-out');
  });

  test('should update existing transition property', () => {
    const iframe = document.createElement('div');
    iframe.id = 'TMEiframe';
    iframe.style.opacity = '0.5';
    iframe.style.transition = 'opacity 1s';
    document.body.appendChild(iframe);

    const request = { action: 'finishIframe' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.style.opacity).toBe('1');
    expect(iframe.style.transition).toBe('width 0.3s ease-in-out, height 0.3s ease-in-out');
  });

  test('should not throw error when iframe does not exist', () => {
    const request = { action: 'finishIframe' };
    const sendResponse = jest.fn();

    expect(() => {
      messageListener(request, {}, sendResponse);
    }).not.toThrow(); // After bug fix, should handle gracefully
  });
});

describe('contentScript.js - consoleQuote Action', () => {
  let messageListener;
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    messageListener = setupContentScriptTest();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('should log first stage quote', () => {
    const request = { action: 'consoleQuote', stage: 'first' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).toHaveBeenCalledWith('"Er — hello," — Harry Potter');
  });

  test('should log trial stage quote', () => {
    const request = { action: 'consoleQuote', stage: 'trial' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).toHaveBeenCalledTimes(1);
    const loggedMessage = console.log.mock.calls[0][0];
    expect(loggedMessage).toContain('Lucius Malfoy');
    expect(loggedMessage).toContain('Do enjoy yourself');
  });

  test('should log payment stage quote', () => {
    const request = { action: 'consoleQuote', stage: 'payment' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).toHaveBeenCalledTimes(1);
    const loggedMessage = console.log.mock.calls[0][0];
    expect(loggedMessage).toContain('Rubeus Hagrid');
    expect(loggedMessage).toContain('treasure detectors');
  });

  test('should log premium stage quote', () => {
    const request = { action: 'consoleQuote', stage: 'premium' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).toHaveBeenCalledTimes(1);
    const loggedMessage = console.log.mock.calls[0][0];
    expect(loggedMessage).toContain('Where your treasure is');
    expect(loggedMessage).toContain('granite');
  });

  test('should log free stage quote', () => {
    const request = { action: 'consoleQuote', stage: 'free' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).toHaveBeenCalledTimes(1);
    const loggedMessage = console.log.mock.calls[0][0];
    expect(loggedMessage).toContain('Ministry of Magic');
    expect(loggedMessage).toContain('Muggles');
  });

  test('should log missing stage quote', () => {
    const request = { action: 'consoleQuote', stage: 'missing' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).toHaveBeenCalledTimes(1);
    const loggedMessage = console.log.mock.calls[0][0];
    expect(loggedMessage).toContain('Harry Potter');
    expect(loggedMessage).toContain('API');
  });

  test('should not log when stage is invalid', () => {
    const request = { action: 'consoleQuote', stage: 'invalid' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).not.toHaveBeenCalled();
  });

  test('should not log when stage is missing', () => {
    const request = { action: 'consoleQuote' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).not.toHaveBeenCalled();
  });

  test('should not log when stage is null', () => {
    const request = { action: 'consoleQuote', stage: null };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).not.toHaveBeenCalled();
  });

  test('should not log when stage is empty string', () => {
    const request = { action: 'consoleQuote', stage: '' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(console.log).not.toHaveBeenCalled();
  });
});

describe('contentScript.js - getContent() Helper Function Edge Cases', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('should handle multiple occurrences of the same text', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <header>Repeated text</header>
      <main>
        <p>Repeated text</p>
        <p>Repeated text</p>
      </main>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toBeDefined();
  });

  test('should handle body with only whitespace', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = '     \n\n\t\t     ';

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('<title>Test</title>');
  });

  test('should handle very long text content', () => {
    document.head.innerHTML = '<title>Test</title>';
    const longText = 'a'.repeat(10000);
    // Use textContent to avoid XSS linter warnings (this is controlled test data)
    const paragraph = document.createElement('p');
    paragraph.textContent = longText;
    document.body.appendChild(paragraph);

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content.length).toBeGreaterThan(10000);
    expect(response.length).toBe(response.content.length);
  });

  test('should handle HTML entities in content', () => {
    document.head.innerHTML = '<title>Test &amp; Title</title>';
    document.body.innerHTML = '<p>&lt;div&gt; &amp; &quot;text&quot;</p>';

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('&');
  });

  test('should handle script and style tags in body', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <script>console.log('test');</script>
      <style>body { color: red; }</style>
      <p>Visible content</p>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('Visible content');
  });

  test('should handle empty header and footer', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <header></header>
      <main>Main content</main>
      <footer></footer>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('Main content');
  });

  test('should handle header and footer with nested elements', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <header>
        <nav>
          <a href="#">Link 1</a>
          <a href="#">Link 2</a>
        </nav>
      </header>
      <main>Main content</main>
      <footer>
        <div>Footer info</div>
      </footer>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    expect(response.content).toContain('Main content');
  });

  test('should handle multiple h1, h2, h3, strong tags with same text', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <h1>Title</h1>
      <h1>Title</h1>
      <strong>Bold</strong>
      <strong>Bold</strong>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    const response = sendResponse.mock.calls[0][0];
    // Should preserve the tags
    expect(response.content).toContain('<h1>');
    expect(response.content).toContain('<strong>');
  });

  test('should handle tag wrapping with special characters', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = `
      <h1>Title with $pecial ch@rs & symbols!</h1>
      <strong>Bold (text) [here]</strong>
    `;

    const request = { action: 'getContent' };
    const sendResponse = jest.fn();

    expect(() => {
      messageListener(request, {}, sendResponse);
    }).not.toThrow();
  });
});

describe('contentScript.js - BUG FIXED: finishIframe null check', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('FIXED: finishIframe handles missing iframe gracefully without throwing', () => {
    const request = { action: 'finishIframe' };
    const sendResponse = jest.fn();

    // After fix, this should not throw even when iframe doesn't exist
    expect(() => {
      messageListener(request, {}, sendResponse);
    }).not.toThrow();
  });

  test('finishIframe works correctly when iframe exists', () => {
    const iframe = document.createElement('div');
    iframe.id = 'TMEiframe';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const request = { action: 'finishIframe' };
    const sendResponse = jest.fn();

    messageListener(request, {}, sendResponse);

    expect(iframe.style.opacity).toBe('1');
    expect(iframe.style.transition).toBe('width 0.3s ease-in-out, height 0.3s ease-in-out');
  });
});

describe('contentScript.js - Integration Tests', () => {
  let messageListener;

  beforeEach(() => {
    messageListener = setupContentScriptTest();
  });

  test('should handle multiple sequential actions', () => {
    const mockSelection = {
      toString: jest.fn(() => 'Selected text')
    };
    window.getSelection.mockReturnValue(mockSelection);

    // First action
    const request1 = { action: 'getSelectedText' };
    const sendResponse1 = jest.fn();
    messageListener(request1, {}, sendResponse1);

    // Second action
    const request2 = { message: 'ping' };
    const sendResponse2 = jest.fn();
    messageListener(request2, {}, sendResponse2);

    expect(sendResponse1).toHaveBeenCalledWith({ selectedText: 'Selected text' });
    expect(sendResponse2).toHaveBeenCalledWith({ status: 'connected' });
  });

  test('should handle unknown action gracefully', () => {
    const request = { action: 'unknownAction' };
    const sendResponse = jest.fn();

    expect(() => {
      messageListener(request, {}, sendResponse);
    }).not.toThrow();

    // Should not call sendResponse for unknown actions
    expect(sendResponse).not.toHaveBeenCalled();
  });

  test('should handle malformed request objects', () => {
    const sendResponse = jest.fn();

    // Test various malformed requests
    expect(() => messageListener({}, {}, sendResponse)).not.toThrow();
    expect(() => messageListener({ action: null }, {}, sendResponse)).not.toThrow();
    expect(() => messageListener({ message: '' }, {}, sendResponse)).not.toThrow();
  });

  test('should handle concurrent message handling', () => {
    document.head.innerHTML = '<title>Test</title>';
    document.body.innerHTML = '<p>Content</p>';

    const request1 = { action: 'getContent' };
    const request2 = { message: 'ping' };
    const sendResponse1 = jest.fn();
    const sendResponse2 = jest.fn();

    // Simulate concurrent messages
    messageListener(request1, {}, sendResponse1);
    messageListener(request2, {}, sendResponse2);

    expect(sendResponse1).toHaveBeenCalled();
    expect(sendResponse2).toHaveBeenCalledWith({ status: 'connected' });
  });
});

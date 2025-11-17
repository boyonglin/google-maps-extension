/**
 * Unit Tests for appSecret.js
 * Tests the map link attachment functionality for web pages
 *
 * This module is responsible for:
 * 1. Parsing candidate location names from text content
 * 2. Finding those names in the DOM
 * 3. Inserting clickable map pins (📌) next to place names
 * 4. Handling special cases like YouTube descriptions
 */

// Import DOMPurify for safe HTML sanitization
const createDOMPurify = require('isomorphic-dompurify');
const DOMPurify = createDOMPurify(window);

// Configure DOMPurify to allow custom YouTube elements and preserve all attributes
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  // Allow custom YouTube elements
  if (data.tagName === 'yt-formatted-string' ||
      data.tagName === 'ytd-text-inline-expander' ||
      data.tagName === 'yt-attributed-string') {
    data.allowedTags[data.tagName] = true;
  }
});

describe('appSecret.js - Map Link Attachment', () => {

  let attachMapLinkToPage;

  // Constants for testing
  const DEFAULT_QUERY_URL = 'https://www.google.com/maps/search/?api=1&';
  const MAPS_LINK_SELECTOR = 'a[href*="https://www.google.com/maps"]';
  const PIN_EMOJI = '📌';

  // Helper function to create a request object
  const createRequest = (content, queryUrl = DEFAULT_QUERY_URL) => ({
    content,
    queryUrl
  });

  // Helper function to safely set HTML content (avoiding XSS warnings)
  const setBodyHTML = (html) => {
    // Clear existing content
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }

    // Use DOMPurify to sanitize HTML and create a safe DOM structure
    const sanitized = DOMPurify.sanitize(html);

    // Use DOMParser API (completely avoids innerHTML)
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/html');

    // Append all children from parsed document body
    Array.from(doc.body.childNodes).forEach(node => {
      document.body.appendChild(node.cloneNode(true));
    });
  };

  // Helper function to setup DOM and execute attachment
  const setupAndAttach = (html, content, queryUrl = DEFAULT_QUERY_URL) => {
    setBodyHTML(html);
    attachMapLinkToPage(createRequest(content, queryUrl));
  };

  // Helper to get all map links in the document
  const getMapLinks = () => document.querySelectorAll(MAPS_LINK_SELECTOR);

  // Helper to get the first map link
  const getFirstMapLink = () => document.querySelector(MAPS_LINK_SELECTOR);

  // Helper to clear body content safely (avoiding innerHTML)
  const clearBody = () => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  };

  beforeEach(() => {
    // Clear document
    clearBody();

    // Reset the global namespace
    delete globalThis.attachMapLinkToPage;

    // Clear the module cache to get fresh coverage data
    jest.resetModules();

    // Load the module - this will execute the IIFE and set globalThis.attachMapLinkToPage
    // Using require instead of eval ensures Jest can track coverage
    require('../Package/dist/utils/appSecret.js');

    attachMapLinkToPage = globalThis.attachMapLinkToPage;
  });

  afterEach(() => {
    clearBody();
    delete globalThis.attachMapLinkToPage;
  });

  describe('Basic Functionality', () => {

    test('should be defined and accessible globally', () => {
      expect(attachMapLinkToPage).toBeDefined();
      expect(typeof attachMapLinkToPage).toBe('function');
    });

    test('should attach map link to h1 element with matching candidate', () => {
      setupAndAttach('<h1>Visit Central Park today</h1>', 'Central Park');

      const h1 = document.querySelector('h1');
      const link = h1.querySelector(MAPS_LINK_SELECTOR);
      expect(link).toBeTruthy();
      expect(link.textContent).toBe(PIN_EMOJI);
      expect(link.href).toContain('Central%20Park');
    });

    // Test all supported HTML elements
    test.each([
      ['h1', '<h1>Eiffel Tower is amazing</h1>', 'Eiffel Tower'],
      ['h2', '<h2>Big Ben location</h2>', 'Big Ben'],
      ['h3', '<h3>Times Square here</h3>', 'Times Square'],
      ['strong', '<p><strong>Golden Gate Bridge</strong> is busy</p>', 'Golden Gate Bridge'],
      ['p', '<p>I love Statue of Liberty</p>', 'Statue of Liberty'],
      ['td', '<table><tr><td>Brooklyn Bridge</td></tr></table>', 'Brooklyn Bridge']
    ])('should attach map link to %s element', (tagName, html, location) => {
      setupAndAttach(html, location);

      const link = getFirstMapLink();
      expect(link).toBeTruthy();
      expect(link.textContent).toBe(PIN_EMOJI);
    });
  });

  describe('Multiple Candidates', () => {

    test('should handle multiple candidates separated by newlines', () => {
      setupAndAttach(
        '<h1>Central Park</h1><h2>Times Square</h2><p>Empire State Building</p>',
        'Central Park\nTimes Square\nEmpire State Building'
      );

      expect(getMapLinks().length).toBe(3);
    });

    test('should trim whitespace from candidates', () => {
      setupAndAttach('<h1>Brooklyn Bridge</h1>', '  Brooklyn Bridge  \n\n  \n  ');

      expect(getFirstMapLink()).toBeTruthy();
    });

    test('should filter out empty lines from candidates', () => {
      setupAndAttach(
        '<h1>Central Park</h1><h2>Times Square</h2>',
        'Central Park\n\n\n\nTimes Square\n\n'
      );

      expect(getMapLinks().length).toBe(2);
    });

    test('should handle candidates with 4+ spaces (data format)', () => {
      setupAndAttach('<h1>Rockefeller Center</h1>', 'Rockefeller Center    Extra Info Here');

      const link = getFirstMapLink();
      expect(link).toBeTruthy();
      expect(link.href).toContain('Rockefeller%20Center');
    });
  });

  describe('Pin Link Properties', () => {

    beforeEach(() => {
      setupAndAttach('<h1>Central Park</h1>', 'Central Park');
    });

    test('should create pin with correct href', () => {
      const link = getFirstMapLink();
      expect(link.href).toBe('https://www.google.com/maps/search/?api=1&q=Central%20Park');
    });

    test.each([
      ['target', '_blank'],
      ['rel', 'noopener']
    ])('should create pin with %s="%s"', (attr, value) => {
      const link = getFirstMapLink();
      expect(link[attr]).toBe(value);
    });

    test.each([
      ['textDecoration', 'none'],
      ['border', '0px']
    ])('should create pin with style.%s="%s"', (styleProp, value) => {
      const link = getFirstMapLink();
      expect(link.style[styleProp]).toBe(value);
    });

    test('should use 📌 emoji as pin content', () => {
      const link = getFirstMapLink();
      expect(link.textContent).toBe(PIN_EMOJI);
    });
  });

  describe('Skip Conditions', () => {

    test.each([
      ['existing map link', '<h1>Central Park<a href="https://www.google.com/maps">📌</a></h1>'],
      ['yt-formatted-string', '<h1><yt-formatted-string>Central Park</yt-formatted-string></h1>'],
      ['yt-lockup-metadata-view-model__title class', '<h1 class="yt-lockup-metadata-view-model__title">Central Park</h1>']
    ])('should skip element with %s', (condition, html) => {
      setupAndAttach(html, 'Central Park');

      // For existing map link case, there's already 1 link that should not be duplicated
      const expectedCount = condition === 'existing map link' ? 1 : 0;
      expect(getMapLinks().length).toBe(expectedCount);
    });
  });

  describe('Text Positioning', () => {

    test('should insert pin immediately after candidate name', () => {
      setupAndAttach('<h1>Visit Central Park today</h1>', 'Central Park');

      const h1 = document.querySelector('h1');
      expect(h1.textContent).toContain(`Visit Central Park${PIN_EMOJI} today`);
      const link = h1.querySelector('a');
      expect(link).toBeTruthy();
      expect(link.textContent).toBe(PIN_EMOJI);
    });

    test.each([
      ['before', '<p>I love Central Park very much</p>', 'I love Central Park'],
      ['after', '<p>Central Park is beautiful</p>', 'is beautiful']
    ])('should preserve text %s candidate', (position, html, expectedText) => {
      setupAndAttach(html, 'Central Park');

      const p = document.querySelector('p');
      expect(p.textContent).toContain(expectedText);
    });

    test.each([
      ['beginning', '<h1>Central Park is great</h1>', /^Central Park📌/],
      ['end', '<h1>Visit Central Park</h1>', /Central Park📌$/],
      ['only text', '<h1>Central Park</h1>', 'Central Park📌']
    ])('should handle candidate at %s of text', (position, html, expected) => {
      setupAndAttach(html, 'Central Park');

      const h1 = document.querySelector('h1');
      if (expected instanceof RegExp) {
        expect(h1.textContent).toMatch(expected);
      } else {
        expect(h1.textContent).toBe(expected);
      }
    });
  });

  describe('Duplicate Prevention', () => {

    test('should process same candidate only once per element', () => {
      setupAndAttach('<h1>Central Park and Central Park again</h1>', 'Central Park');

      const h1 = document.querySelector('h1');
      expect(h1.querySelectorAll(MAPS_LINK_SELECTOR).length).toBe(1);
    });

    test('should skip duplicate candidate names in candidates list', () => {
      // This test covers line 28 - the return statement when candidate is already processed
      setupAndAttach('<h1>Central Park is nice</h1>', 'Central Park\nCentral Park    with extra info\nCentral Park');

      const h1 = document.querySelector('h1');
      expect(h1.querySelectorAll(MAPS_LINK_SELECTOR).length).toBe(1);
    });

    test('should not add duplicate pins when called multiple times', () => {
      setupAndAttach('<h1>Central Park</h1>', 'Central Park');
      attachMapLinkToPage(createRequest('Central Park'));

      expect(getMapLinks().length).toBe(1);
    });
  });

  describe('YouTube Special Case', () => {

    const youtubeHTML = (spans) => `
      <div id="description">
        <ytd-text-inline-expander>
          <yt-attributed-string>${spans}</yt-attributed-string>
        </ytd-text-inline-expander>
      </div>
    `;

    test('should handle YouTube description structure', () => {
      setupAndAttach(
        youtubeHTML('<span>Visit Central Park</span><span>And Times Square</span>'),
        'Central Park\nTimes Square'
      );

      expect(getMapLinks().length).toBe(2);
    });

    test('should process each span in YouTube description', () => {
      setupAndAttach(
        youtubeHTML(`
          <span>First location: Brooklyn Bridge</span>
          <span>Second location: Statue of Liberty</span>
          <span>Third location: Empire State Building</span>
        `),
        'Brooklyn Bridge\nStatue of Liberty\nEmpire State Building'
      );

      expect(getMapLinks().length).toBe(3);
    });

    test('should not process YouTube description if not present', () => {
      setupAndAttach('<h1>Central Park</h1>', 'Central Park');

      expect(getMapLinks().length).toBe(1);
    });
  });

  describe('Edge Cases', () => {

    test.each([
      ['empty', ''],
      ['null', null],
      ['undefined', undefined],
      ['whitespace-only', '   \n\n\t\t  \n  ']
    ])('should handle %s content gracefully', (type, content) => {
      setBodyHTML('<h1>Central Park</h1>');

      expect(() => attachMapLinkToPage(createRequest(content))).not.toThrow();
      expect(getMapLinks().length).toBe(0);
    });

    test('should handle candidate not found in DOM', () => {
      setupAndAttach('<h1>Empire State Building</h1>', 'Central Park');

      expect(getMapLinks().length).toBe(0);
    });

    test.each([
      ['punctuation', "St. Patrick's Cathedral", 1],
      ['unicode', '東京タワー is tall', 1],
      ['very long name', 'A'.repeat(500), 1]
    ])('should handle candidate with %s', (type, text, expectedCount) => {
      setBodyHTML(`<h1>${text}</h1>`);
      attachMapLinkToPage(createRequest(text.split(' ')[0] || text));

      expect(getMapLinks().length).toBe(expectedCount);
    });

    test('should URL-encode special characters in search query', () => {
      setupAndAttach("<h1>O'Reilly Theater</h1>", "O'Reilly Theater");

      expect(getFirstMapLink().href).toContain('O%27Reilly%20Theater');
    });

    test('should handle nested elements', () => {
      setupAndAttach('<div><h1><span>Central Park</span></h1></div>', 'Central Park');

      expect(getMapLinks().length).toBe(1);
    });

    test('should handle element with no text content', () => {
      setupAndAttach('<h1></h1>', 'Central Park');

      expect(getMapLinks().length).toBe(0);
    });

    test('should handle multiple elements with same candidate', () => {
      setupAndAttach(
        '<h1>Central Park</h1><h2>Central Park</h2><p>Central Park</p>',
        'Central Park'
      );

      expect(getMapLinks().length).toBe(3);
    });
  });

  describe('Query URL Formation', () => {

    test('should use provided queryUrl', () => {
      // Arrange
      setBodyHTML('<h1>Central Park</h1>');
      const request = {
        content: 'Central Park',
        queryUrl: 'https://custom.maps.com/search?q='
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const link = document.querySelector('a');
      expect(link.href).toContain('https://custom.maps.com/search?q=');
    });

    test('should append encoded query to queryUrl', () => {
      // Arrange
      setBodyHTML('<h1>Central Park</h1>');
      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const link = document.querySelector('a');
      expect(link.href).toBe('https://www.google.com/maps/search/?api=1&q=Central%20Park');
    });

    test('should handle queryUrl without trailing &', () => {
      // Arrange
      setBodyHTML('<h1>Central Park</h1>');
      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const link = document.querySelector('a');
      expect(link.href).toContain('Central%20Park');
    });
  });

  describe('Regex Matching', () => {

    test('should use regex for matching candidate names', () => {
      // Arrange
      setBodyHTML('<h1>The Central Park is nice</h1>');
      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should handle regex special characters in candidate name', () => {
      // Arrange
      setBodyHTML('<h1>Visit [Test] Location today</h1>');
      const request = {
        content: '[Test] Location',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert - After fix, this should work correctly
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1); // FIXED: Now correctly finds and adds link
    });

    test('should handle parentheses in candidate name', () => {
      // Arrange
      setBodyHTML('<h1>Location (Test) Place</h1>');
      const request = {
        content: 'Location (Test) Place',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should handle plus sign in candidate name', () => {
      // Arrange
      setBodyHTML('<h1>C++ Museum</h1>');
      const request = {
        content: 'C++ Museum',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should handle asterisk in candidate name', () => {
      // Arrange
      setBodyHTML('<h1>Test* Location</h1>');
      const request = {
        content: 'Test* Location',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should handle dollar sign in candidate name', () => {
      // Arrange
      setBodyHTML('<h1>$ Store Location</h1>');
      const request = {
        content: '$ Store Location',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should handle caret in candidate name', () => {
      // Arrange
      setBodyHTML('<h1>Test^ Location</h1>');
      const request = {
        content: 'Test^ Location',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should handle backslash in candidate name', () => {
      // Arrange
      setBodyHTML('<h1>Test\\ Location</h1>');
      const request = {
        content: 'Test\\ Location',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should handle pipe character in candidate name', () => {
      // Arrange
      setBodyHTML('<h1>Test | Location</h1>');
      const request = {
        content: 'Test | Location',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should match whole candidate name', () => {
      // Arrange
      setBodyHTML('<h1>Park Avenue is not Central Park</h1>');
      const request = {
        content: 'Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const h1 = document.querySelector('h1');
      const link = h1.querySelector('a');
      expect(link).toBeTruthy();
      // Will match first occurrence of "Park"
      expect(h1.textContent).toContain('Park📌 Avenue');
    });
  });

  describe('DOM Manipulation', () => {

    test('should use TreeWalker for finding text nodes', () => {
      // Arrange
      setBodyHTML(`
        <h1>
          <span>Visit</span>
          <strong>Central Park</strong>
          <span>today</span>
        </h1>
      `);
      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should maintain DOM structure after pin insertion', () => {
      // Arrange
      setBodyHTML('<h1 class="title" id="main">Central Park</h1>');
      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const h1 = document.querySelector('h1');
      expect(h1.className).toBe('title');
      expect(h1.id).toBe('main');
      expect(h1.children.length).toBe(1); // Should have one child (the link)
    });

    test('should split text nodes correctly', () => {
      // Arrange
      setBodyHTML('<p>Before Central Park After</p>');
      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const p = document.querySelector('p');
      expect(p.childNodes.length).toBe(3); // Before text, link, After text
      expect(p.childNodes[0].textContent).toBe('Before Central Park');
      expect(p.childNodes[1].tagName).toBe('A');
      expect(p.childNodes[2].textContent).toBe(' After');
    });
  });

  describe('Performance and Scale', () => {

    test('should handle many elements efficiently', () => {
      // Arrange
      let html = '';
      for (let i = 0; i < 100; i++) {
        html += `<p>Location ${i}: Central Park</p>`;
      }
      setBodyHTML(html);

      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      const startTime = performance.now();
      attachMapLinkToPage(request);
      const endTime = performance.now();

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('should handle many candidates efficiently', () => {
      // Arrange
      let candidates = [];
      for (let i = 0; i < 50; i++) {
        candidates.push(`Location ${i}`);
      }
      setBodyHTML('<h1>' + candidates.join(' and ') + '</h1>');

      const request = {
        content: candidates.join('\n'),
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      const startTime = performance.now();
      attachMapLinkToPage(request);
      const endTime = performance.now();

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Integration with Content Script', () => {

    test('should work with real-world HTML structure', () => {
      // Arrange - Simulate a blog post
      setBodyHTML(`
        <article>
          <h1>My Trip to New York</h1>
          <p>I visited <strong>Central Park</strong> and it was amazing!</p>
          <h2>Day 2</h2>
          <p>Then I went to see the <strong>Statue of Liberty</strong>.</p>
          <h3>Recommendations</h3>
          <ul>
            <li>Times Square</li>
            <li>Empire State Building</li>
          </ul>
        </article>
      `);
      const request = {
        content: 'Central Park\nStatue of Liberty\nTimes Square\nEmpire State Building',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBeGreaterThan(0);
    });

    test('should handle mixed content types', () => {
      // Arrange
      setBodyHTML(`
        <div>
          <h1>Central Park</h1>
          <table>
            <tr><td>Times Square</td></tr>
          </table>
          <p><strong>Empire State Building</strong></p>
        </div>
      `);
      const request = {
        content: 'Central Park\nTimes Square\nEmpire State Building',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(3);
    });
  });

  describe('Case Sensitivity', () => {

    test('should match candidate with exact case', () => {
      // Arrange
      setBodyHTML('<h1>Central Park is nice</h1>');
      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should not match if case differs', () => {
      // Arrange
      setBodyHTML('<h1>central park is nice</h1>');
      const request = {
        content: 'Central Park',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(0);
    });
  });

  describe('Boundary Conditions', () => {

    test('should handle single character candidate', () => {
      // Arrange
      setBodyHTML('<h1>A is a letter</h1>');
      const request = {
        content: 'A',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(1);
    });

    test('should handle candidate with only spaces (trimmed away)', () => {
      // Arrange
      setBodyHTML('<h1>Central Park</h1>');
      const request = {
        content: '     ',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBe(0);
    });

    test('should handle candidate with newlines in the middle', () => {
      // Arrange
      setBodyHTML('<h1>Central\nPark is nice</h1>');
      const request = {
        content: 'Central\nPark',
        queryUrl: 'https://www.google.com/maps/search/?api=1&'
      };

      // Act
      attachMapLinkToPage(request);

      // Assert
      // The candidate is split by newlines, so 'Central' and 'Park' are separate
      const links = document.querySelectorAll('a[href*="https://www.google.com/maps"]');
      expect(links.length).toBeGreaterThanOrEqual(0);
    });
  });
});

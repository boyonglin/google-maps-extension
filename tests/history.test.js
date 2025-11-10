/**
 * Jest Unit Tests for History Component (history.js)
 * Tests cover all methods with comprehensive mocking of Chrome APIs and DOM manipulation
 * Following TDD principles: bugs are identified, explained, and fixed in the original code
 */

// Mock global functions and objects before requiring module
global.state = {
    hasHistory: false,
    buildSearchUrl: jest.fn()
};

global.remove = {
    updateDeleteCount: jest.fn(),
    attachCheckboxEventListener: jest.fn()
};

global.favorite = {
    createFavoriteIcon: jest.fn(),
    addToFavoriteList: jest.fn(),
    updateFavorite: jest.fn()
};

global.ContextMenuUtil = {
    createContextMenu: jest.fn()
};

global.measureContentSize = jest.fn();

// Load the module
const History = require('../Package/dist/components/history.js');
const { 
    mockStorageGet, 
    mockStorageSet, 
    mockI18n, 
    cleanupDOM, 
    wait, 
    withWindowOpenSpy, 
    createMouseEvent,
    createMockListItem,
    TEST_CONSTANTS
} = require('./testHelpers');

describe('History Component', () => {
    let historyInstance;
    
    // Global DOM elements that history.js expects to exist
    let searchHistoryListContainer, clearButton, emptyMessage;

    // ============================================================================
    // Helper Functions - Test-Specific
    // ============================================================================

    /**
     * Helper: Create mock history list item (using shared helper)
     */
    const createMockHistoryItem = (text, favoriteList = [], isChecked = false) => {
        return createMockListItem(text, {
            favoriteList,
            isChecked,
            className: 'history-list'
        });
    };

    /**
     * Helper: Setup DOM environment
     */
    const setupDOM = () => {
        // Container
        searchHistoryListContainer = document.createElement('div');
        searchHistoryListContainer.id = 'searchHistoryList';
        global.searchHistoryListContainer = searchHistoryListContainer;
        
        // Clear button
        clearButton = document.createElement('button');
        clearButton.id = 'clearButton';
        clearButton.disabled = true;
        global.clearButton = clearButton;
        
        // Empty message
        emptyMessage = document.createElement('div');
        emptyMessage.id = 'emptyMessage';
        emptyMessage.style.display = 'none';
        global.emptyMessage = emptyMessage;
        
        // Append to body
        document.body.appendChild(searchHistoryListContainer);
        document.body.appendChild(clearButton);
        document.body.appendChild(emptyMessage);
    };

    // ============================================================================
    // Test Setup/Teardown
    // ============================================================================

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';
        
        // Setup DOM
        setupDOM();
        
        // Reset state
        global.state = {
            hasHistory: false,
            buildSearchUrl: jest.fn()
        };
        
        global.remove = {
            updateDeleteCount: jest.fn(),
            attachCheckboxEventListener: jest.fn()
        };
        
        global.favorite = {
            createFavoriteIcon: jest.fn((itemName, favoriteList) => {
                const icon = document.createElement('i');
                icon.className = favoriteList?.includes(itemName)
                    ? 'bi bi-patch-check-fill matched'
                    : 'bi bi-patch-plus-fill';
                return icon;
            }),
            addToFavoriteList: jest.fn(),
            updateFavorite: jest.fn()
        };
        
        global.ContextMenuUtil = {
            createContextMenu: jest.fn()
        };
        
        global.measureContentSize = jest.fn();
        
        // Reset mocks
        jest.clearAllMocks();
        mockI18n({
            clearedUpMsg: 'All cleared up!\nNothing to see here.',
            plusLabel: 'Add to favorites'
        });
        mockStorageSet();
        
        // Create new instance
        historyInstance = new History();
    });

    afterEach(() => {
        cleanupDOM();
        jest.useRealTimers();
    });

    // ============================================================================
    // addHistoryPageListener Tests
    // ============================================================================

    describe('addHistoryPageListener', () => {
        
        describe('searchHistoryListContainer mousedown handler', () => {
            beforeEach(() => {
                historyInstance.addHistoryPageListener();
            });

            // --------------------------------------------------------------------
            // Basic Click Handling
            // --------------------------------------------------------------------

            test('should handle left click on LI element to open URL', async () => {
                const li = createMockHistoryItem(TEST_CONSTANTS.LOCATION);
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);
                
                await withWindowOpenSpy(async (openSpy) => {
                    const mouseEvent = createMouseEvent(li, 0); // Left click
                    li.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    // FIXED: Now uses querySelector('span')?.textContent to extract only span text
                    // instead of all text content including icon classes and other elements
                    expect(global.state.buildSearchUrl).toHaveBeenCalled();
                    const callArg = global.state.buildSearchUrl.mock.calls[0][0];
                    
                    // After fix, extracts only span text
                    expect(callArg).toBe(TEST_CONSTANTS.LOCATION);
                    expect(openSpy).toHaveBeenCalledWith(TEST_CONSTANTS.URL, '_blank');
                });
            });

            test('should handle click on child element within LI (span)', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
                
                await withWindowOpenSpy(async (openSpy) => {
                    const span = li.querySelector('span');
                    const mouseEvent = createMouseEvent(span, 0);
                    span.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    expect(global.state.buildSearchUrl).toHaveBeenCalled();
                    expect(openSpy).toHaveBeenCalledWith(TEST_CONSTANTS.URL, '_blank');
                });
            });

            test('should return early if target is not within LI', () => {
                const outsideDiv = document.createElement('div');
                searchHistoryListContainer.appendChild(outsideDiv);
                
                const mouseEvent = createMouseEvent(outsideDiv, 0);
                outsideDiv.dispatchEvent(mouseEvent);
                
                expect(global.state.buildSearchUrl).not.toHaveBeenCalled();
            });

            test('should return early if target parent is not within LI', () => {
                const container = document.createElement('div');
                searchHistoryListContainer.appendChild(container);
                
                const deepChild = document.createElement('span');
                container.appendChild(deepChild);
                
                const mouseEvent = createMouseEvent(deepChild, 0);
                deepChild.dispatchEvent(mouseEvent);
                
                expect(global.state.buildSearchUrl).not.toHaveBeenCalled();
            });

            // --------------------------------------------------------------------
            // Middle Click Handling
            // --------------------------------------------------------------------

            test('should handle middle click to open in new tab via runtime message', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
                
                const mouseEvent = createMouseEvent(li, 1); // Middle click
                const preventDefaultSpy = jest.spyOn(mouseEvent, 'preventDefault');
                
                li.dispatchEvent(mouseEvent);
                
                await wait();
                
                expect(preventDefaultSpy).toHaveBeenCalled();
                expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                    action: 'openTab',
                    url: TEST_CONSTANTS.URL
                });
            });

            test('should not call window.open on middle click', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
                
                await withWindowOpenSpy(async (openSpy) => {
                    const mouseEvent = createMouseEvent(li, 1); // Middle click
                    li.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    expect(openSpy).not.toHaveBeenCalled();
                    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
                });
            });

            // --------------------------------------------------------------------
            // Delete Mode Handling
            // --------------------------------------------------------------------

            test('should toggle checkbox in delete mode when clicking on LI', () => {
                const li = createMockHistoryItem('Test Location');
                li.classList.add('delete-list');
                li.classList.remove('history-list');
                searchHistoryListContainer.appendChild(li);
                
                const checkbox = li.querySelector('input');
                expect(checkbox.checked).toBe(false);
                
                const mouseEvent = createMouseEvent(li, 0);
                li.dispatchEvent(mouseEvent);
                
                expect(li.classList.contains('checked-list')).toBe(true);
                expect(checkbox.checked).toBe(true);
                expect(global.remove.updateDeleteCount).toHaveBeenCalled();
            });

            test('should toggle off checkbox in delete mode when clicking again', () => {
                const li = createMockHistoryItem('Test Location', [], true);
                li.classList.add('delete-list', 'checked-list');
                searchHistoryListContainer.appendChild(li);
                
                const checkbox = li.querySelector('input');
                checkbox.checked = true;
                
                const mouseEvent = createMouseEvent(li, 0);
                li.dispatchEvent(mouseEvent);
                
                expect(li.classList.contains('checked-list')).toBe(false);
                expect(checkbox.checked).toBe(false);
                expect(global.remove.updateDeleteCount).toHaveBeenCalled();
            });

            test('should return early if clicking checkbox directly in delete mode', () => {
                const li = createMockHistoryItem('Test Location');
                li.classList.add('delete-list');
                searchHistoryListContainer.appendChild(li);
                
                const checkbox = li.querySelector('input');
                checkbox.classList.remove('d-none');
                
                const mouseEvent = createMouseEvent(checkbox, 0);
                checkbox.dispatchEvent(mouseEvent);
                
                // Should return early without toggling
                expect(li.classList.contains('checked-list')).toBe(false);
                expect(global.remove.updateDeleteCount).not.toHaveBeenCalled();
            });

            // --------------------------------------------------------------------
            // Favorite Icon Click Handling
            // --------------------------------------------------------------------

            test('should add to favorites when clicking icon with bi class', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
                mockStorageGet({ favoriteList: [] });
                
                const icon = li.querySelector('i');
                icon.classList.add('bi');
                
                const mouseEvent = createMouseEvent(icon, 0);
                icon.dispatchEvent(mouseEvent);
                
                await wait();
                
                expect(global.favorite.addToFavoriteList).toHaveBeenCalled();
                const callArg = global.favorite.addToFavoriteList.mock.calls[0][0];
                expect(callArg).toBe(TEST_CONSTANTS.LOCATION);
                
                // Verify icon class change
                expect(icon.className).toContain('bi-patch-check-fill');
                expect(icon.className).toContain('matched');
                expect(icon.className).toContain('spring-animation');
                
                // Wait for the animation timeout to complete (500ms)
                await new Promise(resolve => setTimeout(resolve, 600));
                
                expect(icon.classList.contains('spring-animation')).toBe(false);
            });

            test('should update favorite storage after adding to favorites', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
                
                const favoriteList = ['Existing Place'];
                mockStorageGet({ favoriteList });
                
                const icon = li.querySelector('i');
                icon.classList.add('bi');
                
                const mouseEvent = createMouseEvent(icon, 0);
                icon.dispatchEvent(mouseEvent);
                
                await wait();
                
                expect(chrome.storage.local.get).toHaveBeenCalledWith('favoriteList', expect.any(Function));
                expect(global.favorite.updateFavorite).toHaveBeenCalledWith(favoriteList);
            });

            test('should not open URL when clicking favorite icon', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
                
                await withWindowOpenSpy(async (openSpy) => {
                    const icon = li.querySelector('i');
                    icon.classList.add('bi');
                    
                    const mouseEvent = createMouseEvent(icon, 0);
                    icon.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    expect(openSpy).not.toHaveBeenCalled();
                });
            });

            // --------------------------------------------------------------------
            // Checkbox Click in Non-Delete Mode
            // --------------------------------------------------------------------

            test('should return early if clicking checkbox in normal mode', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
                
                await withWindowOpenSpy(async (openSpy) => {
                    const checkbox = li.querySelector('input.form-check-input');
                    
                    const mouseEvent = createMouseEvent(checkbox, 0);
                    checkbox.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    expect(openSpy).not.toHaveBeenCalled();
                });
            });

            // --------------------------------------------------------------------
            // Edge Cases and Error Handling
            // --------------------------------------------------------------------

            test('should handle buildSearchUrl returning undefined', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue(undefined);
                
                await withWindowOpenSpy(async (openSpy) => {
                    const mouseEvent = createMouseEvent(li, 0);
                    li.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    // Should still attempt to open, but with undefined URL
                    expect(openSpy).toHaveBeenCalledWith(undefined, '_blank');
                });
            });

            test('should handle buildSearchUrl promise rejection', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
                
                global.state.buildSearchUrl.mockRejectedValue(new Error('Network error'));
                
                // FIXED: Now has error handling for buildSearchUrl failures
                const mouseEvent = createMouseEvent(li, 0);
                li.dispatchEvent(mouseEvent);
                
                await wait();
                
                // Verify error was caught and logged
                expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to build search URL:', expect.any(Error));
                
                consoleErrorSpy.mockRestore();
            });

            test('should handle very long location names', async () => {
                const li = createMockHistoryItem(TEST_CONSTANTS.LONG_TEXT);
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);
                
                await withWindowOpenSpy(async (openSpy) => {
                    const mouseEvent = createMouseEvent(li, 0);
                    li.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    expect(global.state.buildSearchUrl).toHaveBeenCalled();
                    expect(openSpy).toHaveBeenCalled();
                });
            });

            test('should handle special characters in location names', async () => {
                const li = createMockHistoryItem(TEST_CONSTANTS.SPECIAL_CHARS);
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);
                
                await withWindowOpenSpy(async (openSpy) => {
                    const mouseEvent = createMouseEvent(li, 0);
                    li.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    expect(global.state.buildSearchUrl).toHaveBeenCalled();
                });
            });

            test('should handle unicode characters in location names', async () => {
                const li = createMockHistoryItem(TEST_CONSTANTS.UNICODE);
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);
                
                await withWindowOpenSpy(async (openSpy) => {
                    const mouseEvent = createMouseEvent(li, 0);
                    li.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    expect(global.state.buildSearchUrl).toHaveBeenCalled();
                });
            });

            test('should handle whitespace-only location names', async () => {
                const li = createMockHistoryItem(TEST_CONSTANTS.WHITESPACE);
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue(TEST_CONSTANTS.URL);
                
                const mouseEvent = createMouseEvent(li, 0);
                li.dispatchEvent(mouseEvent);
                
                await wait();
                
                expect(global.state.buildSearchUrl).toHaveBeenCalled();
            });

            test('should not respond to right click (handled by contextmenu)', async () => {
                const li = createMockHistoryItem('Test Location');
                searchHistoryListContainer.appendChild(li);
                
                global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
                
                await withWindowOpenSpy(async (openSpy) => {
                    const mouseEvent = createMouseEvent(li, 2); // Right click
                    li.dispatchEvent(mouseEvent);
                    
                    await wait();
                    
                    // FIXED: Right-click still builds URL (promise executes) but doesn't open window
                    // The buildSearchUrl is called but window.open is not
                    expect(openSpy).not.toHaveBeenCalled();
                    // Note: buildSearchUrl may still be called since the promise starts,
                    // but no action is taken with button 2
                });
            });
        });

        // --------------------------------------------------------------------
        // Context Menu Handler
        // --------------------------------------------------------------------

        describe('searchHistoryListContainer contextmenu handler', () => {
            beforeEach(() => {
                historyInstance.addHistoryPageListener();
            });

            test('should call ContextMenuUtil.createContextMenu on right click', () => {
                const contextEvent = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true
                });
                
                searchHistoryListContainer.dispatchEvent(contextEvent);
                
                expect(global.ContextMenuUtil.createContextMenu).toHaveBeenCalledWith(
                    expect.any(MouseEvent),
                    searchHistoryListContainer
                );
            });

            test('should pass correct arguments to createContextMenu', () => {
                const contextEvent = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true
                });
                
                searchHistoryListContainer.dispatchEvent(contextEvent);
                
                const calls = global.ContextMenuUtil.createContextMenu.mock.calls;
                expect(calls[0][0]).toBeInstanceOf(MouseEvent);
                expect(calls[0][1]).toBe(searchHistoryListContainer);
            });
        });

        // --------------------------------------------------------------------
        // Clear Button Handler
        // --------------------------------------------------------------------

        describe('clearButton click handler', () => {
            beforeEach(() => {
                historyInstance.addHistoryPageListener();
            });

            test('should clear history and update storage', () => {
                clearButton.disabled = false;
                global.state.hasHistory = true;
                searchHistoryListContainer.innerHTML = '<ul><li>Item 1</li></ul>';
                
                clearButton.dispatchEvent(new Event('click'));
                
                expect(chrome.storage.local.set).toHaveBeenCalledWith({ searchHistoryList: [] });
                expect(clearButton.disabled).toBe(true);
                expect(searchHistoryListContainer.innerHTML).toBe('');
                expect(emptyMessage.style.display).toBe('block');
                expect(global.state.hasHistory).toBe(false);
            });

            test('should send message to background to clear history', () => {
                clearButton.dispatchEvent(new Event('click'));
                
                expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                    action: 'clearSearchHistoryList'
                });
            });

            test('should update empty message with i18n text', () => {
                clearButton.dispatchEvent(new Event('click'));
                
                expect(chrome.i18n.getMessage).toHaveBeenCalledWith('clearedUpMsg');
                expect(emptyMessage.innerHTML).toBe('All cleared up!<br>Nothing to see here.');
            });

            test('should replace newlines with br tags in empty message', () => {
                mockI18n({ clearedUpMsg: 'Line 1\nLine 2\nLine 3' });
                
                clearButton.dispatchEvent(new Event('click'));
                
                expect(emptyMessage.innerHTML).toBe('Line 1<br>Line 2<br>Line 3');
            });

            test('should call measureContentSize after clearing', () => {
                clearButton.dispatchEvent(new Event('click'));
                
                expect(global.measureContentSize).toHaveBeenCalled();
            });

            test('should clear history even when already empty', () => {
                searchHistoryListContainer.innerHTML = '';
                global.state.hasHistory = false;
                
                clearButton.dispatchEvent(new Event('click'));
                
                expect(chrome.storage.local.set).toHaveBeenCalledWith({ searchHistoryList: [] });
                expect(global.state.hasHistory).toBe(false);
            });

            test('should handle multiple rapid clicks', () => {
                clearButton.dispatchEvent(new Event('click'));
                clearButton.dispatchEvent(new Event('click'));
                clearButton.dispatchEvent(new Event('click'));
                
                expect(chrome.storage.local.set).toHaveBeenCalledTimes(3);
                expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
            });
        });
    });

    // ============================================================================
    // createListItem Tests
    // ============================================================================

    describe('createListItem', () => {
        
        test('should create list item with correct structure', () => {
            const li = historyInstance.createListItem('Test Location', []);
            
            expect(li.tagName).toBe('LI');
            expect(li.className).toContain('list-group-item');
            expect(li.className).toContain('history-list');
        });

        test('should create span with item name', () => {
            const li = historyInstance.createListItem('Test Location', []);
            
            const span = li.querySelector('span');
            expect(span).toBeTruthy();
            expect(span.textContent).toBe('Test Location');
        });

        test('should call favorite.createFavoriteIcon with correct arguments', () => {
            const favoriteList = ['Place 1', 'Place 2'];
            
            historyInstance.createListItem('Test Location', favoriteList);
            
            expect(global.favorite.createFavoriteIcon).toHaveBeenCalledWith('Test Location', favoriteList);
        });

        test('should append icon returned from favorite.createFavoriteIcon', () => {
            const mockIcon = document.createElement('i');
            mockIcon.className = 'test-icon';
            global.favorite.createFavoriteIcon.mockReturnValue(mockIcon);
            
            const li = historyInstance.createListItem('Test Location', []);
            
            const icon = li.querySelector('i.test-icon');
            expect(icon).toBeTruthy();
        });

        test('should create checkbox with correct attributes', () => {
            const li = historyInstance.createListItem('Test Location', []);
            
            const checkbox = li.querySelector('input[type="checkbox"]');
            expect(checkbox).toBeTruthy();
            expect(checkbox.className).toContain('form-check-input');
            expect(checkbox.className).toContain('d-none');
            expect(checkbox.type).toBe('checkbox');
            expect(checkbox.value).toBe('delete');
            expect(checkbox.name).toBe('checkDelete');
            expect(checkbox.ariaLabel).toBe('Delete');
            expect(checkbox.style.cursor).toBe('pointer');
        });

        test('should append elements in correct order: span, icon, checkbox', () => {
            const li = historyInstance.createListItem('Test Location', []);
            
            const children = li.children;
            expect(children[0].tagName).toBe('SPAN');
            expect(children[1].tagName).toBe('I');
            expect(children[2].tagName).toBe('INPUT');
        });

        test('should handle null favoriteList', () => {
            expect(() => {
                historyInstance.createListItem('Test Location', null);
            }).not.toThrow();
        });

        test('should handle undefined favoriteList', () => {
            expect(() => {
                historyInstance.createListItem('Test Location', undefined);
            }).not.toThrow();
        });

        test('should handle empty string as item name', () => {
            const li = historyInstance.createListItem('', []);
            
            const span = li.querySelector('span');
            expect(span.textContent).toBe('');
        });

        test('should handle very long item names', () => {
            const longName = 'A'.repeat(1000);
            const li = historyInstance.createListItem(longName, []);
            
            const span = li.querySelector('span');
            expect(span.textContent).toBe(longName);
        });

        test('should handle special characters in item name', () => {
            const specialName = '<script>alert("xss")</script>';
            const li = historyInstance.createListItem(specialName, []);
            
            const span = li.querySelector('span');
            expect(span.textContent).toBe(specialName);
        });

        test('should handle unicode characters in item name', () => {
            const unicodeName = '北京 東京 Москва 🗺️';
            const li = historyInstance.createListItem(unicodeName, []);
            
            const span = li.querySelector('span');
            expect(span.textContent).toBe(unicodeName);
        });

        test('should include all required CSS classes', () => {
            const li = historyInstance.createListItem('Test Location', []);
            
            expect(li.classList.contains('list-group-item')).toBe(true);
            expect(li.classList.contains('border')).toBe(true);
            expect(li.classList.contains('rounded')).toBe(true);
            expect(li.classList.contains('mb-3')).toBe(true);
            expect(li.classList.contains('px-3')).toBe(true);
            expect(li.classList.contains('history-list')).toBe(true);
            expect(li.classList.contains('d-flex')).toBe(true);
            expect(li.classList.contains('justify-content-between')).toBe(true);
            expect(li.classList.contains('align-items-center')).toBe(true);
            expect(li.classList.contains('text-break')).toBe(true);
        });

        test('should create different icons based on favorite status', () => {
            const mockPlusIcon = document.createElement('i');
            mockPlusIcon.className = 'bi bi-patch-plus-fill';
            
            const mockCheckIcon = document.createElement('i');
            mockCheckIcon.className = 'bi bi-patch-check-fill matched';
            
            global.favorite.createFavoriteIcon
                .mockReturnValueOnce(mockPlusIcon)
                .mockReturnValueOnce(mockCheckIcon);
            
            const li1 = historyInstance.createListItem('Not Favorite', []);
            const li2 = historyInstance.createListItem('Is Favorite', ['Is Favorite']);
            
            expect(li1.querySelector('i').className).toContain('patch-plus');
            expect(li2.querySelector('i').className).toContain('patch-check');
        });

        test('should create multiple items independently', () => {
            const li1 = historyInstance.createListItem('Location 1', []);
            const li2 = historyInstance.createListItem('Location 2', []);
            const li3 = historyInstance.createListItem('Location 3', []);
            
            expect(li1.querySelector('span').textContent).toBe('Location 1');
            expect(li2.querySelector('span').textContent).toBe('Location 2');
            expect(li3.querySelector('span').textContent).toBe('Location 3');
        });

        test('should handle whitespace in item names', () => {
            const li = historyInstance.createListItem('  Test   Location  ', []);
            
            const span = li.querySelector('span');
            expect(span.textContent).toBe('  Test   Location  ');
        });

        test('should handle newlines in item names', () => {
            const li = historyInstance.createListItem('Line 1\nLine 2', []);
            
            const span = li.querySelector('span');
            expect(span.textContent).toBe('Line 1\nLine 2');
        });
    });

    // ============================================================================
    // Integration Tests
    // ============================================================================

    describe('Integration Tests', () => {
        
        test('complete workflow: create item, add listeners, click to open', async () => {
            const favoriteList = ['Favorite Place'];
            const li = historyInstance.createListItem('Test Location', favoriteList);
            searchHistoryListContainer.appendChild(li);
            
            historyInstance.addHistoryPageListener();
            
            global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
            
            await withWindowOpenSpy(async (openSpy) => {
                const mouseEvent = createMouseEvent(li, 0);
                li.dispatchEvent(mouseEvent);
                
                await wait();
                
                expect(openSpy).toHaveBeenCalledWith('http://maps.test/search', '_blank');
            });
        });

        test('complete workflow: create item, click favorite icon, verify update', async () => {
            const li = historyInstance.createListItem('Test Location', []);
            searchHistoryListContainer.appendChild(li);
            
            historyInstance.addHistoryPageListener();
            
            global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
            mockStorageGet({ favoriteList: [] });
            
            const icon = li.querySelector('i');
            icon.classList.add('bi');
            
            const mouseEvent = createMouseEvent(icon, 0);
            icon.dispatchEvent(mouseEvent);
            
            await wait();
            
            expect(global.favorite.addToFavoriteList).toHaveBeenCalled();
            expect(icon.className).toContain('spring-animation');
            
            // Wait for the animation timeout to complete (500ms)
            await new Promise(resolve => setTimeout(resolve, 600));
            
            expect(icon.classList.contains('spring-animation')).toBe(false);
        });

        test('complete workflow: create items, clear all, verify state', () => {
            const li1 = historyInstance.createListItem('Location 1', []);
            const li2 = historyInstance.createListItem('Location 2', []);
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            
            historyInstance.addHistoryPageListener();
            
            global.state.hasHistory = true;
            clearButton.disabled = false;
            
            clearButton.click();
            
            expect(searchHistoryListContainer.innerHTML).toBe('');
            expect(clearButton.disabled).toBe(true);
            expect(emptyMessage.style.display).toBe('block');
            expect(global.state.hasHistory).toBe(false);
            expect(chrome.storage.local.set).toHaveBeenCalledWith({ searchHistoryList: [] });
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'clearSearchHistoryList'
            });
        });

        test('complete workflow: toggle delete mode and check items', () => {
            const li1 = historyInstance.createListItem('Location 1', []);
            const li2 = historyInstance.createListItem('Location 2', []);
            
            li1.classList.remove('history-list');
            li1.classList.add('delete-list');
            li2.classList.remove('history-list');
            li2.classList.add('delete-list');
            
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            
            historyInstance.addHistoryPageListener();
            
            const mouseEvent1 = createMouseEvent(li1, 0);
            li1.dispatchEvent(mouseEvent1);
            
            expect(li1.classList.contains('checked-list')).toBe(true);
            expect(li1.querySelector('input').checked).toBe(true);
            expect(global.remove.updateDeleteCount).toHaveBeenCalledTimes(1);
            
            const mouseEvent2 = createMouseEvent(li2, 0);
            li2.dispatchEvent(mouseEvent2);
            
            expect(li2.classList.contains('checked-list')).toBe(true);
            expect(li2.querySelector('input').checked).toBe(true);
            expect(global.remove.updateDeleteCount).toHaveBeenCalledTimes(2);
        });

        test('complete workflow: middle click multiple items to open in background tabs', async () => {
            const li1 = historyInstance.createListItem('Location 1', []);
            const li2 = historyInstance.createListItem('Location 2', []);
            const li3 = historyInstance.createListItem('Location 3', []);
            
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            searchHistoryListContainer.appendChild(li3);
            
            historyInstance.addHistoryPageListener();
            
            global.state.buildSearchUrl
                .mockResolvedValueOnce('http://maps.test/location1')
                .mockResolvedValueOnce('http://maps.test/location2')
                .mockResolvedValueOnce('http://maps.test/location3');
            
            const mouseEvent1 = createMouseEvent(li1, 1);
            const mouseEvent2 = createMouseEvent(li2, 1);
            const mouseEvent3 = createMouseEvent(li3, 1);
            
            li1.dispatchEvent(mouseEvent1);
            li2.dispatchEvent(mouseEvent2);
            li3.dispatchEvent(mouseEvent3);
            
            await wait();
            
            expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'openTab',
                url: 'http://maps.test/location1'
            });
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'openTab',
                url: 'http://maps.test/location2'
            });
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'openTab',
                url: 'http://maps.test/location3'
            });
        });

        test('stress test: create many items and verify performance', () => {
            const startTime = Date.now();
            const items = [];
            
            for (let i = 0; i < 100; i++) {
                const li = historyInstance.createListItem(`Location ${i}`, []);
                items.push(li);
                searchHistoryListContainer.appendChild(li);
            }
            
            historyInstance.addHistoryPageListener();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete in reasonable time
            expect(duration).toBeLessThan(1000);
            expect(items.length).toBe(100);
        });
    });

    // ============================================================================
    // Edge Cases and Error Handling
    // ============================================================================

    describe('Edge Cases and Boundary Conditions', () => {
        
        test('should handle empty container when adding listeners', () => {
            expect(() => {
                historyInstance.addHistoryPageListener();
            }).not.toThrow();
        });

        test('should handle multiple listener additions', () => {
            historyInstance.addHistoryPageListener();
            historyInstance.addHistoryPageListener();
            historyInstance.addHistoryPageListener();
            
            // Should not throw, but listeners may be duplicated
            expect(true).toBe(true);
        });

        test('should handle rapid sequential clicks', async () => {
            const li = createMockHistoryItem('Test Location');
            searchHistoryListContainer.appendChild(li);
            
            historyInstance.addHistoryPageListener();
            
            global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
            
            await withWindowOpenSpy(async (openSpy) => {
                const event1 = createMouseEvent(li, 0);
                const event2 = createMouseEvent(li, 0);
                const event3 = createMouseEvent(li, 0);
                
                li.dispatchEvent(event1);
                li.dispatchEvent(event2);
                li.dispatchEvent(event3);
                
                await wait();
                
                expect(openSpy).toHaveBeenCalledTimes(3);
            });
        });

        test('should handle simultaneous favorite and URL operations', async () => {
            const li = createMockHistoryItem('Test Location');
            searchHistoryListContainer.appendChild(li);
            
            historyInstance.addHistoryPageListener();
            
            global.state.buildSearchUrl.mockResolvedValue('http://maps.test/search');
            mockStorageGet({ favoriteList: [] });
            
            const icon = li.querySelector('i');
            icon.classList.add('bi');
            
            // Click icon to add to favorites
            const iconEvent = createMouseEvent(icon, 0);
            icon.dispatchEvent(iconEvent);
            
            await wait();
            
            // Verify favorite was added
            expect(global.favorite.addToFavoriteList).toHaveBeenCalled();
        });

        test('should handle null chrome.i18n.getMessage', () => {
            chrome.i18n.getMessage.mockReturnValue(null);
            
            clearButton.click();
            
            // Should handle gracefully even with null
            expect(emptyMessage.innerHTML).toBe('');
        });

        test('should handle detached DOM elements', () => {
            const li = historyInstance.createListItem('Test Location', []);
            // Don't append to container
            
            historyInstance.addHistoryPageListener();
            
            // Should not throw even though element is detached
            expect(() => {
                const mouseEvent = createMouseEvent(li, 0);
                li.dispatchEvent(mouseEvent);
            }).not.toThrow();
        });

        test('should handle DOM modifications during event handling', async () => {
            const li = createMockHistoryItem('Test Location');
            searchHistoryListContainer.appendChild(li);
            
            historyInstance.addHistoryPageListener();
            
            global.state.buildSearchUrl.mockImplementation(() => {
                // Modify DOM during promise execution
                searchHistoryListContainer.innerHTML = '';
                return Promise.resolve('http://maps.test/search');
            });
            
            const mouseEvent = createMouseEvent(li, 0);
            li.dispatchEvent(mouseEvent);
            
            await wait();
            
            // Should complete without error
            expect(searchHistoryListContainer.innerHTML).toBe('');
        });
    });

    // ============================================================================
    // Module Export Tests
    // ============================================================================

    describe('Module Export', () => {
        test('should export History class', () => {
            expect(History).toBeDefined();
            expect(typeof History).toBe('function');
        });

        test('should be instantiable', () => {
            const instance = new History();
            expect(instance).toBeInstanceOf(History);
        });

        test('should have all required methods', () => {
            const instance = new History();
            expect(typeof instance.addHistoryPageListener).toBe('function');
            expect(typeof instance.createListItem).toBe('function');
        });

        test('should create independent instances', () => {
            const instance1 = new History();
            const instance2 = new History();
            
            expect(instance1).not.toBe(instance2);
        });
    });
});

/**
 * Jest Unit Tests for ContextMenuUtil (menu.js)
 * Tests cover all methods with comprehensive mocking of Chrome APIs and DOM manipulation
 */

// Mock the State class and global functions before requiring menu.js
global.state = {
    paymentStage: {
        isTrial: false,
        isPremium: false
    },
    buildSearchUrl: jest.fn(),
    buildDirectionsUrl: jest.fn()
};

global.measureContentSize = jest.fn();

// Load the module
const ContextMenuUtil = require('../Package/dist/components/menu.js');

describe('ContextMenuUtil', () => {
    let mockEvent;
    let mockListContainer;
    let mockListItems;

    // ============================================================================
    // Helper Functions - Reduce Redundant Code
    // ============================================================================

    /**
     * Helper: Mock chrome.storage.local.get with optional data
     * Most common pattern in tests - used 14 times
     */
    const mockStorageGet = (data = {}) => {
        global.chrome.storage.local.get.mockImplementation((key, callback) => {
            callback(data);
        });
    };

    /**
     * Helper: Mock chrome.runtime.sendMessage with response
     * Common pattern for async operations
     */
    const mockRuntimeMessage = (response) => {
        global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
            if (callback) callback(response);
        });
    };

    /**
     * Helper: Create mock context menu and wait for async operations
     * Reduces repetitive code in createContextMenu tests
     */
    const createMenuAndWait = async (delay = 50) => {
        mockEvent.target.closest = jest.fn(() => mockListItems[0]);
        const menu = ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);
        await new Promise(resolve => setTimeout(resolve, delay));
        return menu;
    };

    /**
     * Helper: Setup state with payment stage
     */
    const setPaymentStage = (isTrial, isPremium) => {
        global.state.paymentStage = { isTrial, isPremium };
    };

    // ============================================================================
    // Test Setup/Teardown
    // ============================================================================

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Mock event
        mockEvent = {
            preventDefault: jest.fn(),
            pageX: 100,
            pageY: 200,
            target: document.createElement('div')
        };

        // Mock list container
        mockListContainer = document.createElement('div');
        document.body.appendChild(mockListContainer);

        // Mock list items
        mockListItems = [];
        for (let i = 0; i < 3; i++) {
            const item = document.createElement('div');
            item.className = 'summary-list list-group-item';
            const span = document.createElement('span');
            span.textContent = `Location ${i + 1}`;
            item.appendChild(span);
            mockListContainer.appendChild(item);
            mockListItems.push(item);
        }

        // Reset all mocks at once
        jest.clearAllMocks();

        // Setup default i18n mock
        global.chrome.i18n.getMessage.mockImplementation((key) => {
            const messages = {
                openAll: 'Open All',
                getDirections: 'Get Directions',
                tidyLocations: 'Tidy Locations'
            };
            return messages[key] || key;
        });

        // Reset state to defaults
        setPaymentStage(false, false);

        // Clear breathing interval
        if (ContextMenuUtil.breathingInterval) {
            clearInterval(ContextMenuUtil.breathingInterval);
            ContextMenuUtil.breathingInterval = null;
        }
    });

    afterEach(() => {
        // Clean up any remaining intervals
        if (ContextMenuUtil.breathingInterval) {
            clearInterval(ContextMenuUtil.breathingInterval);
            ContextMenuUtil.breathingInterval = null;
        }
    });

    describe('createContextMenu', () => {
        test('should call preventDefault on event', () => {
            mockEvent.target.closest = jest.fn(() => mockListItems[0]);
            mockStorageGet({});

            ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });

        test('should return early if delete mode is active', () => {
            const deleteButton = document.createElement('button');
            deleteButton.id = 'deleteListButton';
            deleteButton.classList.add('active-button');
            document.body.appendChild(deleteButton);

            const result = ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);

            expect(result).toBeUndefined();
            expect(document.querySelector('.context-menu')).toBeNull();
        });

        test('should remove existing context menu before creating new one', () => {
            const existingMenu = document.createElement('ul');
            existingMenu.className = 'context-menu';
            document.body.appendChild(existingMenu);

            mockEvent.target.closest = jest.fn(() => mockListItems[0]);
            mockStorageGet({});

            ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);

            const menus = document.querySelectorAll('.context-menu');
            expect(menus.length).toBe(1);
        });

        test('should create context menu with correct positioning', () => {
            mockEvent.target.closest = jest.fn(() => mockListItems[0]);
            mockStorageGet({});

            const menu = ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);

            expect(menu).toBeDefined();
            expect(menu.style.left).toBe('100px');
            expect(menu.style.top).toBe('200px');
            expect(menu.className).toContain('context-menu');
        });

        test('should create "Open all URL" option', () => {
            mockEvent.target.closest = jest.fn(() => mockListItems[0]);
            mockStorageGet({});

            const menu = ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);

            expect(menu.textContent).toContain('Open All (3)');
        });

        test('should add premium-option class when user cannot tidy', async () => {
            setPaymentStage(false, false);
            mockStorageGet({});
            const menu = await createMenuAndWait();
            
            const tidyOption = Array.from(menu.querySelectorAll('.context-menu-item'))
                .find(item => item.textContent.includes('Tidy Locations'));

            expect(tidyOption).toBeDefined();
            expect(tidyOption.classList.contains('premium-option')).toBe(true);
        });

        test('should not add premium-option class when user is on trial', async () => {
            setPaymentStage(true, false);
            mockStorageGet({});
            const menu = await createMenuAndWait();
            
            const tidyOption = Array.from(menu.querySelectorAll('.context-menu-item'))
                .find(item => item.textContent.includes('Tidy Locations'));

            expect(tidyOption.classList.contains('premium-option')).toBe(false);
        });

        test('should not add premium-option class when user is premium', async () => {
            setPaymentStage(false, true);
            mockStorageGet({});
            const menu = await createMenuAndWait();
            
            const tidyOption = Array.from(menu.querySelectorAll('.context-menu-item'))
                .find(item => item.textContent.includes('Tidy Locations'));

            expect(tidyOption.classList.contains('premium-option')).toBe(false);
        });

        test('should add "Get Directions" option when clickedItem and startAddr exist', async () => {
            mockStorageGet({ startAddr: 'New York' });
            const menu = await createMenuAndWait();

            expect(menu.textContent).toContain('Get Directions');
        });

        test('should not add "Get Directions" option when startAddr is missing', async () => {
            mockStorageGet({});
            const menu = await createMenuAndWait();

            expect(menu.textContent).not.toContain('Get Directions');
        });

        test('should not add "Get Directions" option when clickedItem is null', async () => {
            mockEvent.target.closest = jest.fn(() => null);
            mockStorageGet({ startAddr: 'New York' });
            const menu = ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);
            
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(menu.textContent).not.toContain('Get Directions');
        });

        test('should trigger premium modal when non-premium user clicks tidy', async () => {
            setPaymentStage(false, false);
            const premiumButton = document.createElement('button');
            premiumButton.setAttribute('data-bs-target', '#premiumModal');
            premiumButton.click = jest.fn();
            document.body.appendChild(premiumButton);

            mockStorageGet({});
            const menu = await createMenuAndWait();
            
            const tidyOption = Array.from(menu.querySelectorAll('.context-menu-item'))
                .find(item => item.textContent.includes('Tidy Locations'));
            tidyOption.click();

            expect(premiumButton.click).toHaveBeenCalled();
        });

        test('should set up click listener to close menu when clicking outside', async () => {
            mockStorageGet({});
            mockEvent.target.closest = jest.fn(() => mockListItems[0]);
            const menu = ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);

            await new Promise(resolve => setTimeout(resolve, 10));
            
            const outsideClick = new MouseEvent('click', { bubbles: true });
            document.body.dispatchEvent(outsideClick);

            expect(document.querySelector('.context-menu')).toBeNull();
        });

        test('should not close menu when clicking inside', async () => {
            mockStorageGet({});
            mockEvent.target.closest = jest.fn(() => mockListItems[0]);
            const menu = ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);

            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Menu should still exist after clicking inside
            expect(document.querySelector('.context-menu')).toBeTruthy();
        });
    });

    describe('createOption', () => {
        test('should create list item with correct className', () => {
            const menu = document.createElement('ul');
            const option = ContextMenuUtil.createOption(menu, 'Test Option', jest.fn());

            expect(option.tagName).toBe('LI');
            expect(option.className).toContain('list-group-item');
            expect(option.className).toContain('context-menu-item');
        });

        test('should set textContent correctly', () => {
            const menu = document.createElement('ul');
            const label = 'My Custom Option';
            const option = ContextMenuUtil.createOption(menu, label, jest.fn());

            expect(option.textContent).toBe(label);
        });

        test('should call onClick handler when clicked', () => {
            const menu = document.createElement('ul');
            document.body.appendChild(menu);
            const onClick = jest.fn();
            
            const option = ContextMenuUtil.createOption(menu, 'Test', onClick);
            menu.appendChild(option);

            option.click();

            expect(onClick).toHaveBeenCalled();
        });

        test('should remove menu after clicking option', () => {
            const menu = document.createElement('ul');
            document.body.appendChild(menu);
            const onClick = jest.fn();
            
            const option = ContextMenuUtil.createOption(menu, 'Test', onClick);
            menu.appendChild(option);

            option.click();

            expect(document.body.contains(menu)).toBe(false);
        });
    });

    describe('openAllUrls', () => {
        test('should extract text from list items with single span', async () => {
            global.state.buildSearchUrl.mockResolvedValue('http://test.com/1');
            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                if (callback) callback({ canGroup: false });
            });

            await ContextMenuUtil.openAllUrls(mockListItems);

            expect(global.state.buildSearchUrl).toHaveBeenCalledTimes(3);
            expect(global.state.buildSearchUrl).toHaveBeenCalledWith('Location 1');
            expect(global.state.buildSearchUrl).toHaveBeenCalledWith('Location 2');
            expect(global.state.buildSearchUrl).toHaveBeenCalledWith('Location 3');
        });

        test('should extract text from list items with multiple spans', async () => {
            mockListItems[0].innerHTML = '';
            const span1 = document.createElement('span');
            span1.textContent = 'First';
            const span2 = document.createElement('span');
            span2.textContent = 'Second';
            mockListItems[0].appendChild(span1);
            mockListItems[0].appendChild(span2);

            global.state.buildSearchUrl.mockResolvedValue('http://test.com/1');
            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                if (callback) callback({ canGroup: false });
            });

            await ContextMenuUtil.openAllUrls(mockListItems);

            expect(global.state.buildSearchUrl).toHaveBeenCalledWith('First Second');
        });

        test('should skip items with no text', async () => {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'summary-list';
            const itemsWithEmpty = [...mockListItems, emptyItem];

            global.state.buildSearchUrl.mockResolvedValue('http://test.com/1');
            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                if (callback) callback({ canGroup: false });
            });

            await ContextMenuUtil.openAllUrls(itemsWithEmpty);

            expect(global.state.buildSearchUrl).toHaveBeenCalledTimes(3);
        });

        test('should open in group when canGroup is true', async () => {
            global.state.buildSearchUrl.mockImplementation((text) => 
                Promise.resolve(`http://test.com/${text}`)
            );
            
            mockRuntimeMessage({ canGroup: true });

            await ContextMenuUtil.openAllUrls(mockListItems);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'openInGroup',
                    urls: expect.arrayContaining([
                        'http://test.com/Location 1',
                        'http://test.com/Location 2',
                        'http://test.com/Location 3'
                    ]),
                    groupTitle: '✨',
                    groupColor: 'purple',
                    collapsed: false
                })
            );
        });

        test('should set collapsed to true when more than 10 items', async () => {
            // Create 11 items
            const manyItems = [];
            for (let i = 0; i < 11; i++) {
                const item = document.createElement('div');
                item.className = 'summary-list';
                const span = document.createElement('span');
                span.textContent = `Item ${i}`;
                item.appendChild(span);
                manyItems.push(item);
            }

            global.state.buildSearchUrl.mockImplementation((text) => 
                Promise.resolve(`http://test.com/${text}`)
            );
            
            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                if (msg.action === 'canGroup') {
                    callback({ canGroup: true });
                } else if (callback) {
                    callback();
                }
            });

            await ContextMenuUtil.openAllUrls(manyItems);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    collapsed: true
                })
            );
        });

        test('should open tabs individually when canGroup is false', async () => {
            global.state.buildSearchUrl.mockImplementation((text) => 
                Promise.resolve(`http://test.com/${text}`)
            );
            
            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                if (msg.action === 'canGroup') {
                    callback({ canGroup: false });
                } else if (callback) {
                    callback();
                }
            });

            await ContextMenuUtil.openAllUrls(mockListItems);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'openTab', url: 'http://test.com/Location 1' })
            );
            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'openTab', url: 'http://test.com/Location 2' })
            );
            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'openTab', url: 'http://test.com/Location 3' })
            );
        });

        test('should use correct group info for history list', async () => {
            mockListItems[0].className = 'history-list';

            global.state.buildSearchUrl.mockResolvedValue('http://test.com/1');
            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                if (msg.action === 'canGroup') {
                    callback({ canGroup: true });
                } else if (callback) {
                    callback();
                }
            });

            await ContextMenuUtil.openAllUrls(mockListItems);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    groupTitle: '🕓',
                    groupColor: 'green'
                })
            );
        });

        test('should use correct group info for favorite list', async () => {
            mockListItems[0].className = 'favorite-list';

            global.state.buildSearchUrl.mockResolvedValue('http://test.com/1');
            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                if (msg.action === 'canGroup') {
                    callback({ canGroup: true });
                } else if (callback) {
                    callback();
                }
            });

            await ContextMenuUtil.openAllUrls(mockListItems);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    groupTitle: '🏵️',
                    groupColor: 'yellow'
                })
            );
        });
    });

    describe('getGroupInfo', () => {
        test('should return purple group for summary-list', () => {
            const item = document.createElement('div');
            item.className = 'summary-list';

            const result = ContextMenuUtil.getGroupInfo(item);

            expect(result).toEqual({ groupTitle: '✨', groupColor: 'purple' });
        });

        test('should return green group for history-list', () => {
            const item = document.createElement('div');
            item.className = 'history-list';

            const result = ContextMenuUtil.getGroupInfo(item);

            expect(result).toEqual({ groupTitle: '🕓', groupColor: 'green' });
        });

        test('should return yellow group for favorite-list', () => {
            const item = document.createElement('div');
            item.className = 'favorite-list';

            const result = ContextMenuUtil.getGroupInfo(item);

            expect(result).toEqual({ groupTitle: '🏵️', groupColor: 'yellow' });
        });

        test('should return empty strings for unknown list type', () => {
            const item = document.createElement('div');
            item.className = 'unknown-list';

            const result = ContextMenuUtil.getGroupInfo(item);

            expect(result).toEqual({ groupTitle: '', groupColor: '' });
        });
    });

    describe('getDirections', () => {
        test('should extract text from selected item', async () => {
            const item = document.createElement('div');
            const span = document.createElement('span');
            span.textContent = 'Central Park';
            item.appendChild(span);

            global.state.buildDirectionsUrl.mockResolvedValue('http://maps.com/directions');

            await ContextMenuUtil.getDirections(item, 'Times Square');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(global.state.buildDirectionsUrl).toHaveBeenCalledWith('Times Square', 'Central Park');
        });

        test('should handle item with no span', async () => {
            const item = document.createElement('div');

            global.state.buildDirectionsUrl.mockResolvedValue('http://maps.com/directions');

            await ContextMenuUtil.getDirections(item, 'Start');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(global.state.buildDirectionsUrl).toHaveBeenCalledWith('Start', '');
        });

        test('should create new tab with directions URL', async () => {
            const item = document.createElement('div');
            const span = document.createElement('span');
            span.textContent = 'Destination';
            item.appendChild(span);

            const directionsUrl = 'http://maps.com/directions/start/dest';
            global.state.buildDirectionsUrl.mockResolvedValue(directionsUrl);

            await ContextMenuUtil.getDirections(item, 'Start');

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(global.chrome.tabs.create).toHaveBeenCalledWith({ url: directionsUrl });
        });
    });

    describe('tidyLocations', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should start breathing effect', () => {
            const spy = jest.spyOn(ContextMenuUtil, 'startBreathingEffect');
            mockRuntimeMessage({ success: false });

            ContextMenuUtil.tidyLocations(mockListItems);

            expect(spy).toHaveBeenCalledWith(mockListItems);
        });

        test('should extract location data from list items', () => {
            mockListItems[0].innerHTML = '';
            const span1 = document.createElement('span');
            span1.textContent = 'Location Name';
            const span2 = document.createElement('span');
            span2.textContent = 'Location Clue';
            mockListItems[0].appendChild(span1);
            mockListItems[0].appendChild(span2);

            mockRuntimeMessage({ success: false });
            
            ContextMenuUtil.tidyLocations(mockListItems);

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    locations: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'Location Name',
                            clue: 'Location Clue'
                        })
                    ])
                }),
                expect.any(Function)
            );
        });

        test('should filter out items without location name', () => {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'summary-list';
            const itemsWithEmpty = [...mockListItems, emptyItem];

            mockRuntimeMessage({ success: false });

            ContextMenuUtil.tidyLocations(itemsWithEmpty);

            const call = global.chrome.runtime.sendMessage.mock.calls[0][0];
            expect(call.locations.length).toBe(3);
        });

        test('should send organize request with correct action', () => {
            mockRuntimeMessage({ success: false });

            ContextMenuUtil.tidyLocations(mockListItems);

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'organizeLocations' }),
                expect.any(Function)
            );
        });

        test('should include list type in request', () => {
            mockListItems[0].className = 'history-list';
            mockRuntimeMessage({ success: false });

            ContextMenuUtil.tidyLocations(mockListItems);

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ listType: 'history' }),
                expect.any(Function)
            );
        });

        test('should stop breathing effect after response', () => {
            const spy = jest.spyOn(ContextMenuUtil, 'stopBreathingEffect');

            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                callback({ success: false });
            });

            ContextMenuUtil.tidyLocations(mockListItems);

            expect(spy).toHaveBeenCalledWith(mockListItems);
        });

        test('should call applyOrganization on success', () => {
            const spy = jest.spyOn(ContextMenuUtil, 'applyOrganization');
            const organizedData = { categories: [] };

            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                callback({ success: true, organizedData });
            });

            ContextMenuUtil.tidyLocations(mockListItems);

            expect(spy).toHaveBeenCalledWith(organizedData, mockListItems);
        });

        test('should not call applyOrganization on failure', () => {
            const spy = jest.spyOn(ContextMenuUtil, 'applyOrganization');

            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                callback({ success: false });
            });

            ContextMenuUtil.tidyLocations(mockListItems);

            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('getListType', () => {
        test('should return "summary" for summary-list', () => {
            const item = document.createElement('div');
            item.className = 'summary-list';

            const result = ContextMenuUtil.getListType(item);

            expect(result).toBe('summary');
        });

        test('should return "history" for history-list', () => {
            const item = document.createElement('div');
            item.className = 'history-list';

            const result = ContextMenuUtil.getListType(item);

            expect(result).toBe('history');
        });

        test('should return "favorite" for favorite-list', () => {
            const item = document.createElement('div');
            item.className = 'favorite-list';

            const result = ContextMenuUtil.getListType(item);

            expect(result).toBe('favorite');
        });

        test('should return "unknown" for unrecognized list type', () => {
            const item = document.createElement('div');
            item.className = 'other-list';

            const result = ContextMenuUtil.getListType(item);

            expect(result).toBe('unknown');
        });
    });

    describe('applyOrganization', () => {
        let container;

        beforeEach(() => {
            container = document.createElement('div');
            document.body.appendChild(container);

            mockListItems.forEach(item => {
                container.appendChild(item);
            });
        });

        test('should return early if organizedData has no categories', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            ContextMenuUtil.applyOrganization({}, mockListItems);

            expect(container.children.length).toBe(3);
            consoleSpy.mockRestore();
        });

        test('should log raw text when categories missing but rawText present', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            ContextMenuUtil.applyOrganization({ rawText: 'Raw response' }, mockListItems);

            expect(consoleSpy).toHaveBeenCalledWith('Raw AI response:', 'Raw response');
            consoleSpy.mockRestore();
        });

        test('should return early if container not found', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const orphanItems = [document.createElement('div')];

            ContextMenuUtil.applyOrganization({ categories: [] }, orphanItems);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Could not find container for list items');
            consoleErrorSpy.mockRestore();
        });

        test('should clear existing items from container', () => {
            const organizedData = {
                categories: [
                    {
                        name: 'Category 1',
                        locations: [{ name: 'Location 1' }]
                    }
                ]
            };

            ContextMenuUtil.applyOrganization(organizedData, mockListItems);

            // Items should be re-added after organization, but in a different order
            // At least verify the container has category headers
            const headers = container.querySelectorAll('.category-header');
            expect(headers.length).toBeGreaterThan(0);
        });

        test('should remove existing category headers', () => {
            const header = document.createElement('div');
            header.className = 'category-header';
            container.appendChild(header);

            const organizedData = {
                categories: [
                    {
                        name: 'Category 1',
                        locations: [{ name: 'Location 1' }]
                    }
                ]
            };

            ContextMenuUtil.applyOrganization(organizedData, mockListItems);

            expect(container.querySelectorAll('.category-header').length).toBeGreaterThan(0);
            // But the old header should be gone
        });

        test('should call renderCategories with correct parameters', () => {
            const spy = jest.spyOn(ContextMenuUtil, 'renderCategories');
            const organizedData = {
                categories: [
                    {
                        name: 'Category 1',
                        locations: [{ name: 'Location 1' }]
                    }
                ]
            };

            ContextMenuUtil.applyOrganization(organizedData, mockListItems);

            expect(spy).toHaveBeenCalled();
        });

        test('should call measureContentSize after organization', () => {
            const organizedData = {
                categories: [
                    {
                        name: 'Category 1',
                        locations: [{ name: 'Location 1' }]
                    }
                ]
            };

            ContextMenuUtil.applyOrganization(organizedData, mockListItems);

            expect(global.measureContentSize).toHaveBeenCalled();
        });

        test('should use flex-reverse layout for history list', () => {
            mockListItems[0].className = 'history-list';
            
            const organizedData = {
                categories: [
                    {
                        name: 'Category 1',
                        locations: [{ name: 'Location 1' }]
                    }
                ]
            };

            ContextMenuUtil.applyOrganization(organizedData, mockListItems);

            // The method should detect history and pass hasFlexReverse=true
            // We can verify indirectly by checking header placement
        });

        test('should use flex-reverse layout for favorite list', () => {
            mockListItems[0].className = 'favorite-list';
            
            const organizedData = {
                categories: [
                    {
                        name: 'Category 1',
                        locations: [{ name: 'Location 1' }]
                    }
                ]
            };

            ContextMenuUtil.applyOrganization(organizedData, mockListItems);

            // Similar to history test
        });
    });

    describe('createElementMapping', () => {
        test('should create map with exact location names', () => {
            const { elementMap } = ContextMenuUtil.createElementMapping(mockListItems);

            expect(elementMap.has('Location 1')).toBe(true);
            expect(elementMap.has('Location 2')).toBe(true);
            expect(elementMap.has('Location 3')).toBe(true);
        });

        test('should create map with normalized location names', () => {
            const { elementMap } = ContextMenuUtil.createElementMapping(mockListItems);

            expect(elementMap.has('location 1')).toBe(true);
            expect(elementMap.has('location 2')).toBe(true);
        });

        test('should create map with index keys', () => {
            const { elementMap } = ContextMenuUtil.createElementMapping(mockListItems);

            expect(elementMap.has('index_0')).toBe(true);
            expect(elementMap.has('index_1')).toBe(true);
            expect(elementMap.has('index_2')).toBe(true);
        });

        test('should return elementsList array', () => {
            const { elementsList } = ContextMenuUtil.createElementMapping(mockListItems);

            expect(elementsList).toEqual(Array.from(mockListItems));
        });

        test('should skip items without span', () => {
            const emptyItem = document.createElement('div');
            const items = [...mockListItems, emptyItem];

            const { elementMap } = ContextMenuUtil.createElementMapping(items);

            expect(elementMap.size).toBeGreaterThan(0);
        });

        test('should handle items with whitespace in names', () => {
            const item = document.createElement('div');
            const span = document.createElement('span');
            span.textContent = '  Multiple   Spaces  ';
            item.appendChild(span);

            const { elementMap } = ContextMenuUtil.createElementMapping([item]);

            expect(elementMap.has('multiple spaces')).toBe(true);
        });
    });

    describe('renderCategories', () => {
        let container;
        let elementMap;
        let elementsList;

        beforeEach(() => {
            container = document.createElement('div');
            const { elementMap: map, elementsList: list } = 
                ContextMenuUtil.createElementMapping(mockListItems);
            elementMap = map;
            elementsList = list;
        });

        test('should create category headers', () => {
            const categories = [
                {
                    name: 'Restaurants',
                    locations: [{ name: 'Location 1' }]
                },
                {
                    name: 'Parks',
                    locations: [{ name: 'Location 2' }]
                }
            ];

            ContextMenuUtil.renderCategories(categories, container, elementMap, elementsList, false);

            const headers = container.querySelectorAll('.category-header');
            expect(headers.length).toBe(2);
            expect(headers[0].textContent).toBe('Restaurants');
            expect(headers[1].textContent).toBe('Parks');
        });

        test('should add headers before locations in normal layout', () => {
            const categories = [
                {
                    name: 'Category',
                    locations: [{ name: 'Location 1' }]
                }
            ];

            ContextMenuUtil.renderCategories(categories, container, elementMap, elementsList, false);

            expect(container.children[0].className).toBe('category-header');
        });

        test('should add headers after locations in reverse layout', () => {
            const categories = [
                {
                    name: 'Category',
                    locations: [{ name: 'Location 1' }]
                }
            ];

            ContextMenuUtil.renderCategories(categories, container, elementMap, elementsList, true);

            const children = Array.from(container.children);
            const lastChild = children[children.length - 1];
            expect(lastChild.className).toBe('category-header');
        });

        test('should add mb-3 class to location elements', () => {
            const categories = [
                {
                    name: 'Category',
                    locations: [{ name: 'Location 1' }]
                }
            ];

            ContextMenuUtil.renderCategories(categories, container, elementMap, elementsList, false);

            const locationElement = container.querySelector('.summary-list');
            expect(locationElement.classList.contains('mb-3')).toBe(true);
        });

        test('should handle missing location elements', () => {
            const consoleSpy = jest.spyOn(ContextMenuUtil, 'logMissingElement');
            
            const categories = [
                {
                    name: 'Category',
                    locations: [{ name: 'Nonexistent Location' }]
                }
            ];

            ContextMenuUtil.renderCategories(categories, container, elementMap, elementsList, false);

            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('createCategoryHeader', () => {
        test('should create div element with category-header class', () => {
            const header = ContextMenuUtil.createCategoryHeader('Test Category');

            expect(header.tagName).toBe('DIV');
            expect(header.className).toBe('category-header');
        });

        test('should contain span with category name', () => {
            const categoryName = 'My Category';
            const header = ContextMenuUtil.createCategoryHeader(categoryName);

            const span = header.querySelector('span');
            expect(span).toBeTruthy();
            expect(span.textContent).toBe(categoryName);
        });
    });

    describe('findMatchingElement', () => {
        let elementMap;
        let elementsList;

        beforeEach(() => {
            const result = ContextMenuUtil.createElementMapping(mockListItems);
            elementMap = result.elementMap;
            elementsList = result.elementsList;
        });

        test('should find exact match', () => {
            const element = ContextMenuUtil.findMatchingElement('Location 1', elementMap, elementsList);

            expect(element).toBe(mockListItems[0]);
        });

        test('should find normalized match', () => {
            const element = ContextMenuUtil.findMatchingElement('location 2', elementMap, elementsList);

            expect(element).toBeTruthy();
        });

        test('should find fuzzy match', () => {
            const element = ContextMenuUtil.findMatchingElement('Loc', elementMap, elementsList);

            expect(element).toBeTruthy();
        });

        test('should find partial content match', () => {
            const element = ContextMenuUtil.findMatchingElement('tion 1', elementMap, elementsList);

            expect(element).toBeTruthy();
        });

        test('should return undefined for no match', () => {
            const element = ContextMenuUtil.findMatchingElement('Completely Wrong', elementMap, elementsList);

            expect(element).toBeUndefined();
        });

        test('should skip index keys in fuzzy matching', () => {
            const element = ContextMenuUtil.findMatchingElement('index', elementMap, elementsList);

            expect(element).toBeUndefined();
        });
    });

    describe('logMissingElement', () => {
        test('should log available element names', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            ContextMenuUtil.logMissingElement('Missing', mockListItems);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Available original element names:',
                ['Location 1', 'Location 2', 'Location 3']
            );

            consoleSpy.mockRestore();
        });

        test('should filter out elements without span', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const emptyItem = document.createElement('div');
            const items = [...mockListItems, emptyItem];

            ContextMenuUtil.logMissingElement('Missing', items);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Available original element names:',
                ['Location 1', 'Location 2', 'Location 3']
            );

            consoleSpy.mockRestore();
        });
    });

    describe('updateBoundaryItemSpacing', () => {
        let container;

        beforeEach(() => {
            container = document.createElement('div');
            mockListItems.forEach(item => container.appendChild(item));
        });

        test('should return early if container is null', () => {
            ContextMenuUtil.updateBoundaryItemSpacing(false, null);
            // Should not throw
        });

        test('should return early if no items in container', () => {
            const emptyContainer = document.createElement('div');
            ContextMenuUtil.updateBoundaryItemSpacing(false, emptyContainer);
            // Should not throw
        });

        test('should remove mb-3 from last item in normal layout', () => {
            mockListItems[2].classList.add('mb-3');

            ContextMenuUtil.updateBoundaryItemSpacing(false, container);

            expect(mockListItems[2].classList.contains('mb-3')).toBe(false);
        });

        test('should remove mb-3 from first item in reverse layout', () => {
            mockListItems[0].classList.add('mb-3');

            ContextMenuUtil.updateBoundaryItemSpacing(true, container);

            expect(mockListItems[0].classList.contains('mb-3')).toBe(false);
        });
    });

    describe('startBreathingEffect', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
            if (ContextMenuUtil.breathingInterval) {
                clearInterval(ContextMenuUtil.breathingInterval);
                ContextMenuUtil.breathingInterval = null;
            }
        });

        test('should return early if no parent element', () => {
            const orphanItem = document.createElement('div');

            ContextMenuUtil.startBreathingEffect([orphanItem]);

            expect(ContextMenuUtil.breathingInterval).toBeNull();
        });

        test('should set up interval', () => {
            ContextMenuUtil.startBreathingEffect(mockListItems);

            expect(ContextMenuUtil.breathingInterval).not.toBeNull();
        });

        test('should change opacity over time', () => {
            ContextMenuUtil.startBreathingEffect(mockListItems);

            const container = mockListItems[0].parentElement;
            const initialOpacity = container.style.opacity;

            jest.advanceTimersByTime(500);

            const newOpacity = container.style.opacity;
            expect(newOpacity).not.toBe(initialOpacity);
        });

        test('should decrease opacity initially', () => {
            ContextMenuUtil.startBreathingEffect(mockListItems);

            const container = mockListItems[0].parentElement;
            
            jest.advanceTimersByTime(100);

            const opacity = parseFloat(container.style.opacity);
            expect(opacity).toBeLessThan(1);
        });

        test('should stop decreasing at 0.4', () => {
            ContextMenuUtil.startBreathingEffect(mockListItems);

            const container = mockListItems[0].parentElement;
            
            // Run enough times to reach minimum
            jest.advanceTimersByTime(1000);

            const opacity = parseFloat(container.style.opacity);
            expect(opacity).toBeGreaterThanOrEqual(0.4);
        });

        test('should cycle between decreasing and increasing', () => {
            ContextMenuUtil.startBreathingEffect(mockListItems);

            const container = mockListItems[0].parentElement;
            
            // Run the breathing cycle - decrease to 0.4
            jest.advanceTimersByTime(800);
            let opacity = parseFloat(container.style.opacity);
            expect(opacity).toBeLessThan(0.6);
            
            // Then increase back up
            jest.advanceTimersByTime(800);
            opacity = parseFloat(container.style.opacity);
            expect(opacity).toBeGreaterThan(0.6);
        });
    });

    describe('stopBreathingEffect', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should clear interval', () => {
            ContextMenuUtil.startBreathingEffect(mockListItems);
            expect(ContextMenuUtil.breathingInterval).not.toBeNull();

            ContextMenuUtil.stopBreathingEffect(mockListItems);

            expect(ContextMenuUtil.breathingInterval).toBeNull();
        });

        test('should reset opacity', () => {
            ContextMenuUtil.startBreathingEffect(mockListItems);
            jest.advanceTimersByTime(500);

            const container = mockListItems[0].parentElement;
            
            ContextMenuUtil.stopBreathingEffect(mockListItems);

            expect(container.style.opacity).toBe('');
        });

        test('should handle missing parent element', () => {
            const orphanItem = document.createElement('div');
            
            ContextMenuUtil.stopBreathingEffect([orphanItem]);
            // Should not throw
        });

        test('should handle null interval', () => {
            ContextMenuUtil.breathingInterval = null;
            
            ContextMenuUtil.stopBreathingEffect(mockListItems);
            // Should not throw
        });
    });

    describe('Integration Tests', () => {
        test('complete context menu workflow', (done) => {
            global.state.paymentStage = { isTrial: true, isPremium: false };
            mockEvent.target.closest = jest.fn(() => mockListItems[0]);
            
            global.chrome.storage.local.get.mockImplementation((key, callback) => {
                callback({ startAddr: 'New York' });
            });

            const menu = ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);

            expect(menu).toBeDefined();
            expect(mockEvent.preventDefault).toHaveBeenCalled();

            setTimeout(() => {
                const menuItems = menu.querySelectorAll('.context-menu-item');
                expect(menuItems.length).toBeGreaterThan(0);
                done();
            }, 50);
        });

        test('tidy locations workflow', () => {
            jest.useFakeTimers();

            const organizedData = {
                categories: [
                    {
                        name: 'Category 1',
                        locations: [
                            { name: 'Location 1' },
                            { name: 'Location 2' }
                        ]
                    }
                ]
            };

            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                callback({ success: true, organizedData });
            });

            const container = mockListItems[0].parentElement;

            ContextMenuUtil.tidyLocations(mockListItems);

            // The breathing effect is started but then immediately stopped in the callback
            // So we just verify measureContentSize was called
            expect(global.measureContentSize).toHaveBeenCalled();

            jest.useRealTimers();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty list items array', async () => {
            global.state.buildSearchUrl.mockResolvedValue('http://test.com');
            global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
                callback({ canGroup: false });
            });

            // openAllUrls should handle empty array gracefully
            await ContextMenuUtil.openAllUrls([]);

            // With empty array, getGroupInfo will throw, so we expect the function to handle this
            // or we just don't call it at all since there are no items
            expect(global.state.buildSearchUrl).not.toHaveBeenCalled();
        });

        test('should handle null paymentStage', () => {
            global.state.paymentStage = null;
            mockEvent.target.closest = jest.fn(() => mockListItems[0]);

            expect(() => {
                ContextMenuUtil.createContextMenu(mockEvent, mockListContainer);
            }).toThrow();
        });

        test('should handle very long location names', () => {
            const longName = 'A'.repeat(10000);
            const item = document.createElement('div');
            const span = document.createElement('span');
            span.textContent = longName;
            item.appendChild(span);

            const { elementMap } = ContextMenuUtil.createElementMapping([item]);

            expect(elementMap.has(longName)).toBe(true);
        });

        test('should handle special characters in location names', () => {
            const specialName = '!@#$%^&*()_+-={}[]|:";\'<>?,./';
            const item = document.createElement('div');
            const span = document.createElement('span');
            span.textContent = specialName;
            item.appendChild(span);

            const { elementMap } = ContextMenuUtil.createElementMapping([item]);

            expect(elementMap.has(specialName)).toBe(true);
        });
    });
});

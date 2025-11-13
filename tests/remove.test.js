/**
 * Jest Unit Tests for Remove Component (remove.js)
 * Tests cover all methods with comprehensive mocking of Chrome APIs and DOM manipulation
 * 
 * BUGS FOUND AND FIXED:
 * 1. addRemoveListener() - cancelButton listener loses 'this' context
 *    - Original: cancelButton.addEventListener("click", this.backToNormal);
 *    - Fixed: cancelButton.addEventListener("click", () => this.backToNormal());
 * 
 * 2. deleteFromFavoriteList() - Potential null reference when history items don't exist
 *    - Issue: Assumes history icons exist for all favorite items being deleted
 *    - Fixed: Added null check for icon.parentElement.querySelector("span")
 */

// Mock global functions and state before requiring module
global.measureContentSize = jest.fn();
global.checkTextOverflow = jest.fn();
global.state = {
    hasHistory: false,
    hasFavorite: false
};

// Load modules
const Remove = require('../Package/dist/components/remove.js');
const { mockStorageGet, mockStorageSet, mockI18n } = require('./testHelpers');
const { setupPopupDOM, teardownPopupDOM } = require('./popupDOMFixture');

describe('Remove Component', () => {
    let removeInstance;

    // ============================================================================
    // Helper Functions - Test-Specific
    // ============================================================================

    /**
     * Helper: Create mock list item with checkbox and icon
     * Note: Keep this for edge case testing where we need specific structures
     */
    const createMockListItem = (text, clueText = null, isChecked = false) => {
        const li = document.createElement('li');
        li.className = 'history-list';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isChecked;
        checkbox.classList.add('d-none');
        
        const icon = document.createElement('i');
        icon.className = 'bi bi-patch-check-fill';
        
        const span = document.createElement('span');
        span.textContent = text;
        
        li.appendChild(checkbox);
        li.appendChild(icon);
        li.appendChild(span);
        
        if (clueText) {
            const clueSpan = document.createElement('span');
            clueSpan.textContent = clueText;
            li.appendChild(clueSpan);
        }
        
        return li;
    };

    // ============================================================================
    // Test Setup/Teardown
    // ============================================================================

    beforeEach(() => {
        // Setup popup DOM (provides all required elements)
        setupPopupDOM();
        
        // Get references to DOM elements (now provided by popup fixture)
        global.cancelButton = document.getElementById('cancelButton');
        global.deleteButton = document.querySelector('#deleteButton');
        global.deleteListButton = document.getElementById('deleteListButton');
        global.searchHistoryButton = document.getElementById('searchHistoryButton');
        global.favoriteListButton = document.getElementById('favoriteListButton');
        global.geminiSummaryButton = document.getElementById('geminiSummaryButton');
        global.searchButtonGroup = document.getElementById('searchButtonGroup');
        global.exportButtonGroup = document.getElementById('exportButtonGroup');
        global.deleteButtonGroup = document.getElementById('deleteButtonGroup');
        global.deleteButtonSpan = document.querySelector('#deleteButton span');
        global.searchHistoryListContainer = document.getElementById('searchHistoryList');
        global.favoriteListContainer = document.getElementById('favoriteList');
        global.clearButton = document.getElementById('clearButton');
        global.exportButton = document.getElementById('exportButton');
        global.emptyMessage = document.getElementById('emptyMessage');
        global.favoriteEmptyMessage = document.getElementById('favoriteEmptyMessage');
        
        // Create UL arrays for the component (it expects arrays)
        const historyUl = document.createElement('ul');
        global.searchHistoryListContainer.appendChild(historyUl);
        global.searchHistoryUl = [historyUl];
        
        const favoriteUl = document.createElement('ul');
        global.favoriteListContainer.appendChild(favoriteUl);
        global.favoriteUl = [favoriteUl];
        
        // Reset state
        global.state = {
            hasHistory: false,
            hasFavorite: false
        };
        
        // Reset mocks
        jest.clearAllMocks();
        mockI18n();
        mockStorageSet();
        
        // Create new instance
        removeInstance = new Remove();
    });

    afterEach(() => {
        teardownPopupDOM();
    });

    // ============================================================================
    // addRemoveListener Tests
    // ============================================================================

    describe('addRemoveListener', () => {
        describe('cancelButton click handler', () => {
            test('should call backToNormal when cancel button is clicked', () => {
                const spy = jest.spyOn(removeInstance, 'backToNormal');
                removeInstance.addRemoveListener();
                
                cancelButton.click();
                
                expect(spy).toHaveBeenCalled();
            });
        });

        describe('deleteButton click handler', () => {
            beforeEach(() => {
                removeInstance.addRemoveListener();
            });

            test('should call deleteFromHistoryList when search history is active', () => {
                const spy = jest.spyOn(removeInstance, 'deleteFromHistoryList');
                const backSpy = jest.spyOn(removeInstance, 'backToNormal');
                
                searchHistoryButton.classList.add('active-button');
                
                deleteButton.click();
                
                expect(spy).toHaveBeenCalled();
                expect(backSpy).toHaveBeenCalled();
            });

            test('should call deleteFromFavoriteList when favorite list is active', () => {
                const spy = jest.spyOn(removeInstance, 'deleteFromFavoriteList');
                const backSpy = jest.spyOn(removeInstance, 'backToNormal');
                
                searchHistoryButton.classList.remove('active-button');
                
                deleteButton.click();
                
                expect(spy).toHaveBeenCalled();
                expect(backSpy).toHaveBeenCalled();
            });

            test('should call measureContentSize after deletion', () => {
                jest.spyOn(removeInstance, 'deleteFromHistoryList').mockImplementation(() => {});
                jest.spyOn(removeInstance, 'backToNormal').mockImplementation(() => {});
                
                deleteButton.click();
                
                expect(global.measureContentSize).toHaveBeenCalled();
            });
        });

        describe('deleteListButton click handler', () => {
            beforeEach(() => {
                const li1 = createMockListItem('Location 1');
                const li2 = createMockListItem('Location 2');
                searchHistoryListContainer.appendChild(li1);
                searchHistoryListContainer.appendChild(li2);
                
                const fli1 = createMockListItem('Favorite 1');
                favoriteListContainer.appendChild(fli1);
                fli1.className = 'favorite-list';
                
                removeInstance.addRemoveListener();
            });

            test('should call backToNormal if deleteListButton is already active', () => {
                const spy = jest.spyOn(removeInstance, 'backToNormal');
                deleteListButton.classList.add('active-button');
                
                deleteListButton.click();
                
                expect(spy).toHaveBeenCalled();
            });

            test('should activate delete mode when clicked', () => {
                deleteListButton.click();
                
                expect(deleteListButton.classList.contains('active-button')).toBe(true);
                expect(deleteListButton.style.pointerEvents).toBe('auto');
            });

            test('should show delete button group and hide search button group', () => {
                deleteListButton.click();
                
                expect(searchButtonGroup.classList.contains('d-none')).toBe(true);
                expect(exportButtonGroup.classList.contains('d-none')).toBe(true);
                expect(deleteButtonGroup.classList.contains('d-none')).toBe(false);
            });

            test('should call checkTextOverflow', () => {
                deleteListButton.click();
                
                expect(global.checkTextOverflow).toHaveBeenCalled();
            });

            test('should show checkboxes and hide favorite icons for history items', () => {
                deleteListButton.click();
                
                const li = searchHistoryListContainer.querySelector('li');
                const checkbox = li.querySelector('input');
                const icon = li.querySelector('i');
                
                expect(checkbox.classList.contains('d-none')).toBe(false);
                expect(icon.classList.contains('d-none')).toBe(true);
            });

            test('should convert history-list items to delete-list', () => {
                deleteListButton.click();
                
                const li = searchHistoryListContainer.querySelector('li');
                
                expect(li.classList.contains('delete-list')).toBe(true);
                expect(li.classList.contains('history-list')).toBe(false);
            });

            test('should convert favorite-list items to delete-list', () => {
                deleteListButton.click();
                
                const li = favoriteListContainer.querySelector('li');
                
                expect(li.classList.contains('delete-list')).toBe(true);
                expect(li.classList.contains('favorite-list')).toBe(false);
            });

            test('should disable favoriteListButton when search history is active', () => {
                searchHistoryButton.classList.add('active-button');
                deleteListButton.click();
                
                expect(favoriteListButton.disabled).toBe(true);
                expect(geminiSummaryButton.disabled).toBe(true);
            });

            test('should disable searchHistoryButton when favorite list is active', () => {
                searchHistoryButton.classList.remove('active-button');
                deleteListButton.click();
                
                expect(searchHistoryButton.disabled).toBe(true);
                expect(geminiSummaryButton.disabled).toBe(true);
            });

            test('should call updateDeleteCount', () => {
                const spy = jest.spyOn(removeInstance, 'updateDeleteCount');
                deleteListButton.click();
                
                expect(spy).toHaveBeenCalled();
            });
        });
    });

    // ============================================================================
    // deleteFromHistoryList Tests
    // ============================================================================

    describe('deleteFromHistoryList', () => {
        beforeEach(() => {
            global.state.hasHistory = true;
        });

        test('should remove checked items from DOM', () => {
            const li1 = createMockListItem('Location 1', null, true);
            const li2 = createMockListItem('Location 2', null, false);
            const li3 = createMockListItem('Location 3', null, true);
            
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            searchHistoryListContainer.appendChild(li3);
            
            mockStorageGet({ searchHistoryList: ['Location 1', 'Location 2', 'Location 3'] });
            
            removeInstance.deleteFromHistoryList();
            
            const remainingItems = searchHistoryListContainer.querySelectorAll('li');
            expect(remainingItems.length).toBe(1);
            expect(remainingItems[0].querySelector('span').textContent).toBe('Location 2');
        });

        test('should update chrome storage with filtered list', () => {
            const li1 = createMockListItem('Location 1', null, true);
            const li2 = createMockListItem('Location 2', null, false);
            
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            
            mockStorageGet({ searchHistoryList: ['Location 1', 'Location 2'] });
            
            removeInstance.deleteFromHistoryList();
            
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                searchHistoryList: ['Location 2']
            });
        });

        test('should set hasHistory to false when all items deleted', () => {
            const li1 = createMockListItem('Location 1', null, true);
            searchHistoryListContainer.appendChild(li1);
            
            mockStorageGet({ searchHistoryList: ['Location 1'] });
            
            removeInstance.deleteFromHistoryList();
            
            expect(global.state.hasHistory).toBe(false);
        });

        test('should disable clearButton when all items deleted', () => {
            const li1 = createMockListItem('Location 1', null, true);
            searchHistoryListContainer.appendChild(li1);
            
            mockStorageGet({ searchHistoryList: ['Location 1'] });
            
            removeInstance.deleteFromHistoryList();
            
            expect(clearButton.disabled).toBe(true);
        });

        test('should hide history ul and show empty message when all items deleted', () => {
            const li1 = createMockListItem('Location 1', null, true);
            searchHistoryListContainer.appendChild(li1);
            
            mockStorageGet({ searchHistoryList: ['Location 1'] });
            
            removeInstance.deleteFromHistoryList();
            
            expect(searchHistoryUl[0].classList.contains('d-none')).toBe(true);
            expect(emptyMessage.style.display).toBe('block');
            expect(emptyMessage.innerHTML).toContain('All cleared up!');
        });

        test('should not change hasHistory when some items remain', () => {
            const li1 = createMockListItem('Location 1', null, true);
            const li2 = createMockListItem('Location 2', null, false);
            
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            
            mockStorageGet({ searchHistoryList: ['Location 1', 'Location 2'] });
            
            removeInstance.deleteFromHistoryList();
            
            expect(global.state.hasHistory).toBe(true);
        });

        test('should handle items with no checked boxes', () => {
            const li1 = createMockListItem('Location 1', null, false);
            searchHistoryListContainer.appendChild(li1);
            
            mockStorageGet({ searchHistoryList: ['Location 1'] });
            
            removeInstance.deleteFromHistoryList();
            
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                searchHistoryList: ['Location 1']
            });
        });
    });

    // ============================================================================
    // deleteFromFavoriteList Tests
    // ============================================================================

    describe('deleteFromFavoriteList', () => {
        beforeEach(() => {
            global.state.hasFavorite = true;
        });

        test('should remove checked items from DOM', () => {
            const li1 = createMockListItem('Favorite 1', null, true);
            const li2 = createMockListItem('Favorite 2', null, false);
            
            li1.className = 'favorite-list';
            li2.className = 'favorite-list';
            
            favoriteListContainer.appendChild(li1);
            favoriteListContainer.appendChild(li2);
            
            mockStorageGet({ favoriteList: ['Favorite 1', 'Favorite 2'] });
            
            removeInstance.deleteFromFavoriteList();
            
            const remainingItems = favoriteListContainer.querySelectorAll('li');
            expect(remainingItems.length).toBe(1);
            expect(remainingItems[0].querySelector('span').textContent).toBe('Favorite 2');
        });

        test('should handle items with clue text', () => {
            const li1 = createMockListItem('Favorite 1', 'Clue 1', true);
            li1.className = 'favorite-list';
            favoriteListContainer.appendChild(li1);
            
            mockStorageGet({ favoriteList: ['Favorite 1 @Clue 1'] });
            
            removeInstance.deleteFromFavoriteList();
            
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                favoriteList: []
            });
        });

        test('should update history icons when favorite is deleted', () => {
            // Create history item
            const historyLi = createMockListItem('Location 1');
            const historyIcon = historyLi.querySelector('i');
            historyIcon.className = 'bi bi-patch-check-fill';
            searchHistoryListContainer.appendChild(historyLi);
            
            // Create favorite item with same name
            const favoriteLi = createMockListItem('Location 1', null, true);
            favoriteLi.className = 'favorite-list';
            favoriteListContainer.appendChild(favoriteLi);
            
            mockStorageGet({ favoriteList: ['Location 1'] });
            
            removeInstance.deleteFromFavoriteList();
            
            expect(historyIcon.className).toBe('bi bi-patch-plus-fill');
        });

        test('should update chrome storage with filtered list', () => {
            const li1 = createMockListItem('Favorite 1', null, true);
            const li2 = createMockListItem('Favorite 2', null, false);
            
            li1.className = 'favorite-list';
            li2.className = 'favorite-list';
            
            favoriteListContainer.appendChild(li1);
            favoriteListContainer.appendChild(li2);
            
            mockStorageGet({ favoriteList: ['Favorite 1', 'Favorite 2'] });
            
            removeInstance.deleteFromFavoriteList();
            
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                favoriteList: ['Favorite 2']
            });
        });

        test('should set hasFavorite to false when all items deleted', () => {
            const li1 = createMockListItem('Favorite 1', null, true);
            li1.className = 'favorite-list';
            favoriteListContainer.appendChild(li1);
            
            mockStorageGet({ favoriteList: ['Favorite 1'] });
            
            removeInstance.deleteFromFavoriteList();
            
            expect(global.state.hasFavorite).toBe(false);
        });

        test('should disable exportButton when all items deleted', () => {
            const li1 = createMockListItem('Favorite 1', null, true);
            li1.className = 'favorite-list';
            favoriteListContainer.appendChild(li1);
            
            mockStorageGet({ favoriteList: ['Favorite 1'] });
            
            removeInstance.deleteFromFavoriteList();
            
            expect(exportButton.disabled).toBe(true);
        });

        test('should hide favorite ul and show empty message when all items deleted', () => {
            const li1 = createMockListItem('Favorite 1', null, true);
            li1.className = 'favorite-list';
            favoriteListContainer.appendChild(li1);
            
            mockStorageGet({ favoriteList: ['Favorite 1'] });
            
            removeInstance.deleteFromFavoriteList();
            
            expect(favoriteUl[0].classList.contains('d-none')).toBe(true);
            expect(favoriteEmptyMessage.style.display).toBe('block');
            expect(favoriteEmptyMessage.innerHTML).toContain('All cleared up!');
        });

        test('should not change hasFavorite when some items remain', () => {
            const li1 = createMockListItem('Favorite 1', null, true);
            const li2 = createMockListItem('Favorite 2', null, false);
            
            li1.className = 'favorite-list';
            li2.className = 'favorite-list';
            
            favoriteListContainer.appendChild(li1);
            favoriteListContainer.appendChild(li2);
            
            mockStorageGet({ favoriteList: ['Favorite 1', 'Favorite 2'] });
            
            removeInstance.deleteFromFavoriteList();
            
            expect(global.state.hasFavorite).toBe(true);
        });

        test('should handle history icon update when parent element is null', () => {
            // Create favorite item without corresponding history item
            const favoriteLi = createMockListItem('Favorite 1', null, true);
            favoriteLi.className = 'favorite-list';
            favoriteListContainer.appendChild(favoriteLi);
            
            // Create orphan icon (not properly attached to DOM)
            const orphanIcon = document.createElement('i');
            searchHistoryListContainer.appendChild(orphanIcon);
            
            mockStorageGet({ favoriteList: ['Favorite 1'] });
            
            // Should not throw error
            expect(() => {
                removeInstance.deleteFromFavoriteList();
            }).not.toThrow();
        });
    });

    // ============================================================================
    // attachCheckboxEventListener Tests
    // ============================================================================

    describe('attachCheckboxEventListener', () => {
        test('should add checked-list class when checkbox is checked', () => {
            const li = createMockListItem('Location 1');
            const checkbox = li.querySelector('input');
            searchHistoryListContainer.appendChild(li);
            
            removeInstance.attachCheckboxEventListener(searchHistoryListContainer);
            
            // Programmatically set checked before clicking (simulates user checking)
            checkbox.checked = false; // Start unchecked
            checkbox.click(); // This will make it checked
            
            expect(li.classList.contains('checked-list')).toBe(true);
        });

        test('should remove checked-list class when checkbox is unchecked', () => {
            const li = createMockListItem('Location 1', null, true);
            li.classList.add('checked-list');
            const checkbox = li.querySelector('input');
            searchHistoryListContainer.appendChild(li);
            
            removeInstance.attachCheckboxEventListener(searchHistoryListContainer);
            
            // Start checked, click to uncheck
            checkbox.checked = true; // Ensure it starts checked
            checkbox.click(); // This will make it unchecked
            
            expect(li.classList.contains('checked-list')).toBe(false);
        });

        test('should call updateDeleteCount when checkbox state changes', () => {
            const li = createMockListItem('Location 1');
            const checkbox = li.querySelector('input');
            searchHistoryListContainer.appendChild(li);
            
            const spy = jest.spyOn(removeInstance, 'updateDeleteCount');
            removeInstance.attachCheckboxEventListener(searchHistoryListContainer);
            
            checkbox.click();
            
            expect(spy).toHaveBeenCalled();
        });

        test('should attach listeners to multiple checkboxes', () => {
            const li1 = createMockListItem('Location 1');
            const li2 = createMockListItem('Location 2');
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            
            const spy = jest.spyOn(removeInstance, 'updateDeleteCount');
            removeInstance.attachCheckboxEventListener(searchHistoryListContainer);
            
            li1.querySelector('input').click();
            li2.querySelector('input').click();
            
            expect(spy).toHaveBeenCalledTimes(2);
        });

        test('should handle empty container', () => {
            expect(() => {
                removeInstance.attachCheckboxEventListener(searchHistoryListContainer);
            }).not.toThrow();
        });
    });

    // ============================================================================
    // updateDeleteCount Tests
    // ============================================================================

    describe('updateDeleteCount', () => {
        test('should enable delete button when items are checked', () => {
            const li = createMockListItem('Location 1', null, true);
            searchHistoryListContainer.appendChild(li);
            searchHistoryButton.classList.add('active-button');
            
            removeInstance.updateDeleteCount();
            
            expect(deleteButton.classList.contains('disabled')).toBe(false);
        });

        test('should disable delete button when no items are checked', () => {
            const li = createMockListItem('Location 1', null, false);
            searchHistoryListContainer.appendChild(li);
            searchHistoryButton.classList.add('active-button');
            
            removeInstance.updateDeleteCount();
            
            expect(deleteButton.classList.contains('disabled')).toBe(true);
        });

        test('should update button text with count for history list', () => {
            const li1 = createMockListItem('Location 1', null, true);
            const li2 = createMockListItem('Location 2', null, true);
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            searchHistoryButton.classList.add('active-button');
            
            removeInstance.updateDeleteCount();
            
            expect(deleteButtonSpan.textContent).toBe('Delete (2)');
        });

        test('should update button text with count for favorite list', () => {
            const li1 = createMockListItem('Favorite 1', null, true);
            const li2 = createMockListItem('Favorite 2', null, true);
            const li3 = createMockListItem('Favorite 3', null, true);
            favoriteListContainer.appendChild(li1);
            favoriteListContainer.appendChild(li2);
            favoriteListContainer.appendChild(li3);
            searchHistoryButton.classList.remove('active-button');
            
            removeInstance.updateDeleteCount();
            
            expect(deleteButtonSpan.textContent).toBe('Delete (3)');
        });

        test('should show empty delete text when no items checked', () => {
            searchHistoryButton.classList.add('active-button');
            
            removeInstance.updateDeleteCount();
            
            expect(deleteButtonSpan.textContent).toBe('Delete');
        });

        test('should use i18n for delete button text', () => {
            const li = createMockListItem('Location 1', null, true);
            searchHistoryListContainer.appendChild(li);
            searchHistoryButton.classList.add('active-button');
            
            removeInstance.updateDeleteCount();
            
            expect(chrome.i18n.getMessage).toHaveBeenCalledWith('deleteBtnText', '1');
        });

        test('should use i18n for empty delete button text', () => {
            searchHistoryButton.classList.add('active-button');
            
            removeInstance.updateDeleteCount();
            
            expect(chrome.i18n.getMessage).toHaveBeenCalledWith('deleteBtnTextEmpty');
        });
    });

    // ============================================================================
    // backToNormal Tests
    // ============================================================================

    describe('backToNormal', () => {
        beforeEach(() => {
            deleteListButton.classList.add('active-button');
            deleteListButton.style.pointerEvents = 'auto';
            deleteButtonGroup.classList.remove('d-none');
        });

        test('should reset deleteListButton styles', () => {
            removeInstance.backToNormal();
            
            expect(deleteListButton.style.pointerEvents).toBe('');
            expect(deleteListButton.classList.contains('active-button')).toBe(false);
        });

        test('should hide delete button group', () => {
            removeInstance.backToNormal();
            
            expect(deleteButtonGroup.classList.contains('d-none')).toBe(true);
        });

        test('should show search button group when history is active', () => {
            searchHistoryButton.classList.add('active-button');
            searchButtonGroup.classList.add('d-none');
            
            removeInstance.backToNormal();
            
            expect(searchButtonGroup.classList.contains('d-none')).toBe(false);
            expect(favoriteListButton.disabled).toBe(false);
            expect(geminiSummaryButton.disabled).toBe(false);
        });

        test('should show export button group when favorite is active', () => {
            searchHistoryButton.classList.remove('active-button');
            
            removeInstance.backToNormal();
            
            expect(exportButtonGroup.classList.contains('d-none')).toBe(false);
            expect(searchHistoryButton.disabled).toBe(false);
            expect(geminiSummaryButton.disabled).toBe(false);
        });

        test('should call updateInput', () => {
            const spy = jest.spyOn(removeInstance, 'updateInput');
            
            removeInstance.backToNormal();
            
            expect(spy).toHaveBeenCalled();
        });
    });

    // ============================================================================
    // updateInput Tests
    // ============================================================================

    describe('updateInput', () => {
        test('should call updateListElements for history items', () => {
            const li = createMockListItem('Location 1');
            searchHistoryListContainer.appendChild(li);
            
            const spy = jest.spyOn(removeInstance, 'updateListElements');
            
            removeInstance.updateInput();
            
            expect(spy).toHaveBeenCalledWith(
                expect.any(NodeList),
                'history'
            );
        });

        test('should call updateListElements for favorite items', () => {
            const li = createMockListItem('Favorite 1');
            li.className = 'favorite-list';
            favoriteListContainer.appendChild(li);
            
            const spy = jest.spyOn(removeInstance, 'updateListElements');
            
            removeInstance.updateInput();
            
            expect(spy).toHaveBeenCalledWith(
                expect.any(NodeList),
                'favorite'
            );
        });
    });

    // ============================================================================
    // updateListElements Tests
    // ============================================================================

    describe('updateListElements', () => {
        test('should hide checkboxes and show icons', () => {
            const li = createMockListItem('Location 1');
            const checkbox = li.querySelector('input');
            const icon = li.querySelector('i');
            
            checkbox.classList.remove('d-none');
            icon.classList.add('d-none');
            
            removeInstance.updateListElements([li], 'history');
            
            expect(checkbox.classList.contains('d-none')).toBe(true);
            expect(icon.classList.contains('d-none')).toBe(false);
        });

        test('should remove checked-list class', () => {
            const li = createMockListItem('Location 1');
            li.classList.add('checked-list');
            
            removeInstance.updateListElements([li], 'history');
            
            expect(li.classList.contains('checked-list')).toBe(false);
        });

        test('should uncheck checkboxes', () => {
            const li = createMockListItem('Location 1', null, true);
            
            removeInstance.updateListElements([li], 'history');
            
            expect(li.querySelector('input').checked).toBe(false);
        });

        test('should remove delete-list class and add list-type class', () => {
            const li = createMockListItem('Location 1');
            li.classList.add('delete-list');
            li.classList.remove('history-list');
            
            removeInstance.updateListElements([li], 'history');
            
            expect(li.classList.contains('delete-list')).toBe(false);
            expect(li.classList.contains('history-list')).toBe(true);
        });

        test('should add favorite-list class when type is favorite', () => {
            const li = createMockListItem('Favorite 1');
            li.className = 'delete-list';
            
            removeInstance.updateListElements([li], 'favorite');
            
            expect(li.classList.contains('favorite-list')).toBe(true);
            expect(li.classList.contains('delete-list')).toBe(false);
        });

        test('should handle multiple items', () => {
            const li1 = createMockListItem('Location 1');
            const li2 = createMockListItem('Location 2');
            li1.classList.add('delete-list');
            li2.classList.add('delete-list');
            
            removeInstance.updateListElements([li1, li2], 'history');
            
            expect(li1.classList.contains('history-list')).toBe(true);
            expect(li2.classList.contains('history-list')).toBe(true);
        });

        test('should handle empty array', () => {
            expect(() => {
                removeInstance.updateListElements([], 'history');
            }).not.toThrow();
        });
    });

    // ============================================================================
    // Integration Tests
    // ============================================================================

    describe('Integration Tests', () => {
        test('complete deletion workflow for history items', () => {
            const li1 = createMockListItem('Location 1');
            const li2 = createMockListItem('Location 2');
            searchHistoryListContainer.appendChild(li1);
            searchHistoryListContainer.appendChild(li2);
            
            removeInstance.addRemoveListener();
            mockStorageGet({ searchHistoryList: ['Location 1', 'Location 2'] });
            
            // Enter delete mode
            deleteListButton.click();
            expect(deleteListButton.classList.contains('active-button')).toBe(true);
            
            // Check items
            li1.querySelector('input').checked = true;
            
            // Delete
            searchHistoryButton.classList.add('active-button');
            deleteButton.click();
            
            expect(searchHistoryListContainer.querySelectorAll('li').length).toBe(1);
        });

        test('complete deletion workflow for favorite items', () => {
            const li1 = createMockListItem('Favorite 1');
            const li2 = createMockListItem('Favorite 2');
            li1.className = 'favorite-list';
            li2.className = 'favorite-list';
            favoriteListContainer.appendChild(li1);
            favoriteListContainer.appendChild(li2);
            
            removeInstance.addRemoveListener();
            mockStorageGet({ favoriteList: ['Favorite 1', 'Favorite 2'] });
            
            // Enter delete mode
            searchHistoryButton.classList.remove('active-button');
            deleteListButton.click();
            
            // Check items
            li1.querySelector('input').checked = true;
            
            // Delete
            deleteButton.click();
            
            expect(favoriteListContainer.querySelectorAll('li').length).toBe(1);
        });

        test('cancel deletion workflow', () => {
            const li = createMockListItem('Location 1');
            searchHistoryListContainer.appendChild(li);
            
            removeInstance.addRemoveListener();
            
            // Enter delete mode
            deleteListButton.click();
            expect(li.querySelector('input').classList.contains('d-none')).toBe(false);
            
            // Cancel
            cancelButton.click();
            expect(li.querySelector('input').classList.contains('d-none')).toBe(true);
        });

        test('toggle delete mode on and off', () => {
            removeInstance.addRemoveListener();
            
            // Turn on
            deleteListButton.click();
            expect(deleteListButton.classList.contains('active-button')).toBe(true);
            
            // Turn off
            deleteListButton.click();
            expect(deleteListButton.classList.contains('active-button')).toBe(false);
        });
    });

    // ============================================================================
    // Edge Cases
    // ============================================================================

    describe('Edge Cases', () => {
        test('should handle empty search history list', () => {
            mockStorageGet({ searchHistoryList: [] });
            
            expect(() => {
                removeInstance.deleteFromHistoryList();
            }).not.toThrow();
        });

        test('should handle empty favorite list', () => {
            mockStorageGet({ favoriteList: [] });
            
            expect(() => {
                removeInstance.deleteFromFavoriteList();
            }).not.toThrow();
        });

        test('should handle undefined favorite list in storage', () => {
            const li = createMockListItem('Favorite 1', null, true);
            li.className = 'favorite-list';
            favoriteListContainer.appendChild(li);
            
            mockStorageGet({});
            
            // Should not crash when favoriteList is undefined
            expect(() => {
                removeInstance.deleteFromFavoriteList();
            }).not.toThrow();
        });

        test('should handle items with special characters in text', () => {
            const li = createMockListItem('!@#$%^&*()');
            searchHistoryListContainer.appendChild(li);
            li.querySelector('input').checked = true;
            
            mockStorageGet({ searchHistoryList: ['!@#$%^&*()'] });
            
            expect(() => {
                removeInstance.deleteFromHistoryList();
            }).not.toThrow();
        });

        test('should handle items with very long text', () => {
            const longText = 'A'.repeat(10000);
            const li = createMockListItem(longText);
            searchHistoryListContainer.appendChild(li);
            li.querySelector('input').checked = true;
            
            mockStorageGet({ searchHistoryList: [longText] });
            
            expect(() => {
                removeInstance.deleteFromHistoryList();
            }).not.toThrow();
        });

        test('should handle missing storage data', () => {
            const li = createMockListItem('Location 1', null, true);
            searchHistoryListContainer.appendChild(li);
            
            mockStorageGet({});
            
            // Should not crash, though storage callback won't execute properly
            expect(() => {
                removeInstance.deleteFromHistoryList();
            }).not.toThrow();
        });

        test('should handle items with multiple clue spans', () => {
            const li = document.createElement('li');
            li.className = 'favorite-list';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            
            const icon = document.createElement('i');
            
            const span1 = document.createElement('span');
            span1.textContent = 'Location';
            const span2 = document.createElement('span');
            span2.textContent = 'Clue 1';
            const span3 = document.createElement('span');
            span3.textContent = 'Clue 2';
            
            li.appendChild(checkbox);
            li.appendChild(icon);
            li.appendChild(span1);
            li.appendChild(span2);
            li.appendChild(span3);
            
            favoriteListContainer.appendChild(li);
            
            mockStorageGet({ favoriteList: ['Location @Clue 1'] });
            
            // Should handle extra spans gracefully
            expect(() => {
                removeInstance.deleteFromFavoriteList();
            }).not.toThrow();
        });

        test('should handle rapid button clicks', () => {
            removeInstance.addRemoveListener();
            
            // Rapidly toggle delete mode
            deleteListButton.click(); // On
            deleteListButton.click(); // Off
            deleteListButton.click(); // On again
            
            // Should end in active mode (clicked 3 times: on, off, on)
            expect(deleteListButton.classList.contains('active-button')).toBe(true);
        });

        test('should handle checkbox events when not in delete mode', () => {
            const li = createMockListItem('Location 1');
            searchHistoryListContainer.appendChild(li);
            
            removeInstance.attachCheckboxEventListener(searchHistoryListContainer);
            
            // Click checkbox (though it should be hidden in normal mode)
            const spy = jest.spyOn(removeInstance, 'updateDeleteCount');
            li.querySelector('input').click();
            
            expect(spy).toHaveBeenCalled();
        });
    });
});

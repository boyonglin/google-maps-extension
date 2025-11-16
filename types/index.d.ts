/**
 * Type definitions for The Maps Express Chrome Extension
 * These types improve IDE IntelliSense, enable better Copilot suggestions,
 * and provide compile-time type checking for JavaScript files
 */

/**
 * Global augmentations for window object
 */
declare global {
  interface Window {
    TMEhasRun?: boolean;
  }

  const TME: {
    setup: () => void;
  };
}

/**
 * Chrome Extension Message Types
 */
export interface ChromeMessage {
  action?: string;
  searchTerm?: string;
  content?: string;
  tabId?: number;
  message?: string;
  selectedText?: string;
  prompt?: string;
  apiKey?: string;
  locations?: Location[];
  listType?: string;
  urls?: string[];
  title?: string;
  color?: string;
  collapsed?: boolean;
  user?: any;
}

/**
 * Storage data structures
 */
export interface StorageData {
  searchHistoryList?: SearchHistoryItem[];
  favoriteList?: FavoriteItem[];
  geminiApiKey?: string;
  startAddr?: string;
  authUser?: number;
  isIncognito?: boolean;
  videoSummaryToggle?: boolean;
}

export interface SearchHistoryItem {
  url: string;
  name: string;
  timestamp?: number;
}

export interface FavoriteItem {
  url: string;
  name: string;
  addedAt?: number;
}

export interface Location {
  name: string;
  url: string;
}

/**
 * ExtPay payment gateway types
 */
export interface ExtPayUser {
  paid: boolean;
  paidAt: Date | null;
  installedAt: Date;
  trialStartedAt: Date | null;
}

export interface ExtPayInstance {
  getUser(): Promise<ExtPayUser>;
  openPaymentPage(): void;
  openTrialPage(trialLength?: number): void;
  onPaid: {
    addListener(callback: (user: ExtPayUser) => void): void;
  };
}

/**
 * Component class interfaces
 */
export interface StateComponent {
  hasInit: boolean;
  checkIsIncognito(): Promise<boolean>;
}

export interface RemoveComponent {
  init(): void;
  toggleDeleteMode(): void;
}

export interface FavoriteComponent {
  init(): void;
  exportToCSV(): void;
  importFromCSV(file: File): void;
}

export interface HistoryComponent {
  init(): void;
  addHistoryPageListener(): void;
  createListItem(item: SearchHistoryItem, favoriteList: FavoriteItem[]): HTMLElement;
}

export interface GeminiComponent {
  init(): void;
  sendPrompt(prompt: string, content: string): Promise<void>;
  clearSummary(): void;
}

export interface ModalComponent {
  init(): void;
  show(): void;
  hide(): void;
}

/**
 * Gemini API types
 */
export interface GeminiPrompt {
  placeTitle: string;
  videoTitle: string;
}

export interface GeminiResponse {
  content?: string;
  error?: string;
}

/**
 * Utility function types
 */
export type RetryOptions = {
  retries?: number;
  delay?: number;
  canRetry?: (error: any) => boolean;
};

export {}; // Ensure this file is treated as a module

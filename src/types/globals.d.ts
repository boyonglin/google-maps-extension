// Global type declarations for the extension

// CommonJS module support
declare const module: { exports: any } | undefined;

// DOM elements referenced in popup context
declare const state: any;
declare const shortcutTip: HTMLCollectionOf<Element>;
declare const premiumNoteElement: HTMLElement;
declare const paymentSpan: HTMLElement;
declare const mapsButton: HTMLAnchorElement;

// Modal utilities
declare const modal: {
  text2Modal: (noteId: string, text: string, modalId: string) => void;
  text2Link: (noteId: string, text: string, url: string) => void;
};

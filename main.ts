import {
    App,
    ButtonComponent,
    Editor,
    ItemView,
    MarkdownRenderer,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    TFile,
    WorkspaceLeaf,
    debounce,
    setIcon
} from 'obsidian';
import { FSRS, generatorParameters, Rating, State, Card as FSRSCard } from 'ts-fsrs';
import * as CryptoJS from 'crypto-js';
import { Chart, registerables } from 'chart.js';
import { PouchDBManager } from './src/database/PouchDBManager';
import { DataMigration } from './src/database/DataMigration';

// --- CONSTANTS ---
const VIEW_TYPE_DASHBOARD = 'fsrs-dashboard-view';
const ICON_NAME = 'book-heart';


function generateBlockId(length: number = 6): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `fsrs-${result}`;
}

// --- DATA INTERFACES ---

interface FSRSParameters { request_retention: number; maximum_interval: number; w: readonly number[]; }
interface FSRSSettings { 
    deckTag: string; 
    newCardsPerDay: number; 
    reviewsPerDay: number; 
    fontSize: number; 
    fsrsParams: FSRSParameters;
    // Sync settings
    syncEnabled: boolean;
    syncUrl: string;
    syncDbName: string;
    syncUsername: string;
    syncPassword: string;
    usePouchDB: boolean;
}
const DEFAULT_SETTINGS: FSRSSettings = { 
    deckTag: 'flashcards', 
    newCardsPerDay: 20, 
    reviewsPerDay: 200, 
    fontSize: 18, 
    fsrsParams: generatorParameters(),
    syncEnabled: false,
    syncUrl: '',
    syncDbName: 'neuralcard',
    syncUsername: '',
    syncPassword: '',
    usePouchDB: true
};

type CardType = 'basic' | 'cloze';
interface CardData { id: string; deckId: string; filePath: string; type: CardType; originalText: string; front: string; back: string; }
type FSRSData = FSRSCard;
interface Card extends CardData { fsrsData?: FSRSData; }
interface Deck { id: string; title: string; filePath: string; cardIds: Set<string>; stats: { new: number; due: number; learning: number; }; }
interface ReviewLog { cardId: string; timestamp: number; rating: Rating; }
interface PluginData { settings: FSRSSettings; cardData: Record<string, FSRSData>; reviewHistory: ReviewLog[]; }

// --- DATA MANAGER ---

class DataManager {
    private plugin: FSRSFlashcardsPlugin;
    private fsrs: FSRS;
    private decks: Map<string, Deck> = new Map();
    private cards: Map<string, Card> = new Map();
    private fsrsDataStore: Record<string, FSRSData> = {};
    private reviewHistory: ReviewLog[] = [];
    private pouchDB: PouchDBManager | null = null;
    private migrationCompleted: boolean = false;

    constructor(plugin: FSRSFlashcardsPlugin) { 
        this.plugin = plugin; 
        this.fsrs = new FSRS(plugin.settings.fsrsParams);
        if (plugin.settings.usePouchDB) {
            this.pouchDB = new PouchDBManager('neuralcard_local');
        }
    }

    getPouchDB(): PouchDBManager | null {
        return this.pouchDB;
    }
    
    async initializeSync() {
        if (this.plugin.settings.syncEnabled && 
            this.plugin.settings.syncUrl && 
            this.pouchDB) {
            try {
                // Build authenticated URL if credentials are provided
                const syncUrl = this.buildAuthenticatedUrl(
                    this.plugin.settings.syncUrl,
                    this.plugin.settings.syncDbName,
                    this.plugin.settings.syncUsername,
                    this.plugin.settings.syncPassword
                );
                console.log('Initializing sync with:', this.sanitizeUrl(syncUrl));
                
                // Setup sync event handlers
                this.pouchDB.onSyncChange((info) => {
                    console.log('Synced changes:', info);
                    if (info.change.docs_written > 0) {
                        new Notice(`Synced ${info.change.docs_written} changes`, 2000);
                    }
                });
                
                this.pouchDB.onSyncError((err) => {
                    console.error('Sync error:', err);
                    new Notice(`Sync error: ${err.message}`, 5000);
                });
                
                this.pouchDB.onSyncActive(() => {
                    console.log('Sync active');
                });
                
                this.pouchDB.onSyncPaused((err) => {
                    if (err) {
                        console.warn('Sync paused with error:', err);
                    }
                });
                
                await this.pouchDB.setupSync(syncUrl);
                new Notice('Sync initialized successfully');
            } catch (error) {
                console.error('Failed to initialize sync:', error);
                new Notice(`Sync initialization failed: ${error.message}`);
            }
        }
    }
    
    private buildAuthenticatedUrl(url: string, dbName: string, username: string, password: string): string {
        try {
            // Ensure URL ends with /
            if (!url.endsWith('/')) {
                url += '/';
            }
            
            const urlObj = new URL(url);
            
            // Append database name
            // Remove leading slash from dbName if present to avoid double slashes
            const cleanDbName = dbName.startsWith('/') ? dbName.substring(1) : dbName;
            
            // If pathname is just /, replace it. If it has a path, append to it.
            if (urlObj.pathname === '/' || urlObj.pathname === '') {
                 urlObj.pathname = '/' + cleanDbName;
            } else if (!urlObj.pathname.endsWith('/' + cleanDbName)) {
                 // Avoid appending if already present
                 if (urlObj.pathname.endsWith('/')) {
                     urlObj.pathname += cleanDbName;
                 } else {
                     urlObj.pathname += '/' + cleanDbName;
                 }
            }
            
            if (username && password) {
                urlObj.username = encodeURIComponent(username);
                urlObj.password = encodeURIComponent(password);
            }
            
            return urlObj.toString();
        } catch (error) {
            console.error('Failed to build authenticated URL:', error);
            return url;
        }
    }
    
    private sanitizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            if (urlObj.password) {
                urlObj.password = '***';
            }
            return urlObj.toString();
        } catch (error) {
            return url;
        }
    }
    
    async stopSync() {
        if (this.pouchDB) {
            await this.pouchDB.stopSync();
        }
    }
    async load() {
        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            await this.loadFromPouchDB();
        } else {
            await this.loadFromLegacyJSON();
        }
        await this.buildIndex();
    }

    private async loadFromPouchDB() {
        if (!this.pouchDB) return;
        
        console.log('Loading data from PouchDB...');
        
        // Load card states
        this.fsrsDataStore = await this.pouchDB.getAllCardStates();
        
        // Load review history
        this.reviewHistory = await this.pouchDB.getReviewHistory();
        
        console.log(`Loaded ${Object.keys(this.fsrsDataStore).length} cards and ${this.reviewHistory.length} reviews from PouchDB`);
    }

    private async loadFromLegacyJSON() {
        console.log('Loading data from legacy JSON...');
        const data: PluginData | null = await this.plugin.loadData();
        const cardData = data?.cardData || {};
        for (const cardId in cardData) { 
            const card = cardData[cardId]; 
            if (card.due) card.due = new Date(card.due); 
            if (card.last_review) card.last_review = new Date(card.last_review); 
        }
        this.fsrsDataStore = cardData;
        this.reviewHistory = data?.reviewHistory || [];
    }
    async save() { 
        // Always save settings to data.json
        await this.plugin.saveData({ 
            settings: this.plugin.settings, 
            cardData: this.plugin.settings.usePouchDB ? {} : this.fsrsDataStore,
            reviewHistory: this.plugin.settings.usePouchDB ? [] : this.reviewHistory
        });
    }
    updateFsrsParameters(params: FSRSParameters) { this.fsrs = new FSRS(params); }
    async buildIndex() {
        console.log("FSRS: Building index...");
        this.decks.clear(); this.cards.clear();
        for (const file of this.plugin.app.vault.getMarkdownFiles()) { await this.updateFile(file); }
        this.recalculateAllDeckStats();
        console.log(`FSRS: Index complete. Found ${this.decks.size} decks and ${this.cards.size} cards.`);
    }
    private getDeckId(path: string): string { return CryptoJS.SHA256(path).toString(); }
    async updateFile(file: TFile) {
        const deckId = this.getDeckId(file.path);
        const cache = this.plugin.app.metadataCache.getFileCache(file);
        const deckTag = `#${this.plugin.settings.deckTag}`;
        const isDeck = cache?.tags?.some(t => t.tag === deckTag) || cache?.frontmatter?.tags?.includes(this.plugin.settings.deckTag);
        this.removeDeck(deckId, false);
        if (!isDeck) return;

        const title = cache?.frontmatter?.title || file.basename;
        const newDeck: Deck = { id: deckId, title, filePath: file.path, cardIds: new Set(), stats: { new: 0, due: 0, learning: 0 } };
        const content = await this.plugin.app.vault.read(file);

        // Basic Cards
        const basicCardsRaw = content.split(/---\s*card\s*---/i).slice(1);
        for (const cardRaw of basicCardsRaw) {
            const parts = cardRaw.split(/\n---\n/);
            if (parts.length < 2) continue;

            const frontPart = parts[0];
            const backPart = parts.slice(1).join('\n---\n');

            const blockIdMatch = frontPart.match(/\^([a-zA-Z0-9-]+)\s*$/m);
            let cardId: string;
            let front = frontPart.trim();

            if (blockIdMatch) {
                cardId = blockIdMatch[1];
                front = frontPart.replace(/\^([a-zA-Z0-9-]+)\s*$/m, '').trim();
            } else {
                cardId = CryptoJS.SHA256(file.path + '::' + front).toString();
            }

            const back = backPart.trim();
            if (!front || !back) continue;

            const card: Card = { id: cardId, deckId, filePath: file.path, type: 'basic', originalText: cardRaw, front, back, fsrsData: this.fsrsDataStore[cardId] };
            this.cards.set(cardId, card); newDeck.cardIds.add(cardId);
        }

        // Cloze Deletion Cards
        const paragraphs = content.split(/\n\s*\n/);
        for (const paragraph of paragraphs) {
            const clozeRegex = /==c(\d+)::(.*?)==/gs;
            const clozes = [...paragraph.matchAll(clozeRegex)];

            if (clozes.length === 0) continue;

            const blockIdMatch = paragraph.match(/\^([a-zA-Z0-9-]+)\s*$/);

            clozes.forEach(cloze => {
                const clozeNum = cloze[1];
                const clozeText = cloze[2];
                const originalCloze = cloze[0];

                let cardId: string;
                if (blockIdMatch) {
                    cardId = `${blockIdMatch[1]}-${clozeNum}`;
                } else {
                    cardId = CryptoJS.SHA256(`${file.path}::${paragraph}::${clozeNum}`).toString();
                }

                const front = paragraph.replace(originalCloze, '[...]');
                const back = paragraph.replace(/==c\d+::(.*?)==/g, '$1');

                const card: Card = { id: cardId, deckId, filePath: file.path, type: 'cloze', originalText: paragraph, front, back, fsrsData: this.fsrsDataStore[cardId] };
                this.cards.set(cardId, card);
                newDeck.cardIds.add(cardId);
            });
        }

        if (newDeck.cardIds.size > 0) this.decks.set(deckId, newDeck);
    }
    removeDeck(deckId: string, fullDelete: boolean = true) { const deck = this.decks.get(deckId); if (deck) { deck.cardIds.forEach(cardId => { this.cards.delete(cardId); if (fullDelete) delete this.fsrsDataStore[cardId]; }); this.decks.delete(deckId); if (fullDelete) this.save(); } }
    async renameDeck(file: TFile, oldPath: string) {
        const oldDeckId = this.getDeckId(oldPath);
        this.removeDeck(oldDeckId, false);
        await this.updateFile(file);
        await this.save();
    }
    recalculateAllDeckStats() { const now = new Date(); for (const deck of this.decks.values()) { deck.stats = { new: 0, due: 0, learning: 0 }; for (const cardId of deck.cardIds) { const fsrsData = this.fsrsDataStore[cardId]; if (!fsrsData || fsrsData.state === State.New) { deck.stats.new++; } else { if (fsrsData.state === State.Learning || fsrsData.state === State.Relearning) deck.stats.learning++; if (fsrsData.due <= now) deck.stats.due++; } } } }
    getDecks(): Deck[] { return Array.from(this.decks.values()).sort((a, b) => a.title.localeCompare(b.title)); }
    getAllCards(): Card[] { return Array.from(this.cards.values()); }
    getCardsByDeck(deckId: string): Card[] {
        const deck = this.decks.get(deckId);
        if (!deck) return [];
        return Array.from(deck.cardIds).map(id => this.cards.get(id)!).filter(Boolean);
    }
    getReviewQueue(deckId: string): Card[] { const deck = this.decks.get(deckId); if (!deck) return []; const now = new Date(); const allCards = Array.from(deck.cardIds).map(id => this.cards.get(id)!).filter(Boolean); const dueCards = allCards.filter(c => c.fsrsData && c.fsrsData.state !== State.New && c.fsrsData.due <= now).sort((a, b) => a.fsrsData!.due.getTime() - b.fsrsData!.due.getTime()); const newCards = allCards.filter(c => !c.fsrsData || c.fsrsData.state === State.New); return [...dueCards.slice(0, this.plugin.settings.reviewsPerDay), ...newCards.slice(0, this.plugin.settings.newCardsPerDay)]; }
    getAllCardsForStudy(deckId: string): Card[] { const deck = this.decks.get(deckId); if (!deck) return []; const now = new Date(); const allCards = Array.from(deck.cardIds).map(id => this.cards.get(id)!).filter(Boolean); const dueCards = allCards.filter(c => c.fsrsData && c.fsrsData.state !== State.New && c.fsrsData.due <= now).sort((a, b) => a.fsrsData!.due.getTime() - b.fsrsData!.due.getTime()); const newCards = allCards.filter(c => !c.fsrsData || c.fsrsData.state === State.New); return [...dueCards, ...newCards]; }
    updateCard(card: Card, rating: Rating) { 
        const now = new Date(); 
        const fsrsCard = card.fsrsData || { due: now, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: State.New, learning_steps: 0 }; 
        const scheduling_cards = this.fsrs.repeat(fsrsCard, now); 
        const newFsrsData = scheduling_cards[rating as Exclude<Rating, Rating.Manual>].card; 
        this.fsrsDataStore[card.id] = newFsrsData; 
        card.fsrsData = newFsrsData; 
        
        const reviewLog = { cardId: card.id, timestamp: now.getTime(), rating };
        this.reviewHistory.push(reviewLog);
        
        // Save immediately to PouchDB if enabled
        if (this.plugin.settings.usePouchDB && this.pouchDB) {
            this.pouchDB.saveCardState(card.id, card.deckId, card.filePath, newFsrsData).catch(err => 
                console.error('Failed to save card state:', err)
            );
            this.pouchDB.addReviewLog(card.id, now.getTime(), rating).catch(err => 
                console.error('Failed to save review log:', err)
            );
        } else {
            this.save();
        }
    }
    getNextReviewIntervals(card: Card): Record<Exclude<Rating, Rating.Manual>, string> { const now = new Date(); const fsrsCard = card.fsrsData || { due: now, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: State.New, learning_steps: 0 }; const scheduling_cards = this.fsrs.repeat(fsrsCard, now); const formatInterval = (days: number): string => { if (days < 1) return "<1d"; if (days < 30) return `${Math.round(days)}d`; if (days < 365) return `${(days / 30).toFixed(1)}m`; return `${(days / 365).toFixed(1)}y`; }; return { [Rating.Again]: formatInterval(scheduling_cards[Rating.Again].card.scheduled_days), [Rating.Hard]: formatInterval(scheduling_cards[Rating.Hard].card.scheduled_days), [Rating.Good]: formatInterval(scheduling_cards[Rating.Good].card.scheduled_days), [Rating.Easy]: formatInterval(scheduling_cards[Rating.Easy].card.scheduled_days), }; }
    getStats() { const now = new Date(); const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); const reviewsToday = this.reviewHistory.filter(log => log.timestamp >= todayStart); const activity = new Array(30).fill(0); this.reviewHistory.forEach(log => { const daysAgo = Math.floor((now.getTime() - log.timestamp) / (1000 * 60 * 60 * 24)); if (daysAgo < 30) activity[29 - daysAgo]++; }); const forecast = new Array(7).fill(0); let mature = 0, learning = 0, young = 0, total = 0; for (const card of this.cards.values()) { const data = this.fsrsDataStore[card.id]; if (data) { total++; if (data.due <= now) { const daysForward = Math.floor((data.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); if (daysForward < 7 && daysForward >= 0) forecast[daysForward]++; } if (data.stability >= 21) mature++; else if (data.state === State.Review) young++; else learning++; } } return { reviewsToday: reviewsToday.length, activity, forecast, maturity: { mature, young, learning, new: this.cards.size - total } }; }
}

// --- UI: DASHBOARD VIEW ---
class DashboardView extends ItemView {
    private plugin: FSRSFlashcardsPlugin; constructor(leaf: WorkspaceLeaf, plugin: FSRSFlashcardsPlugin) { super(leaf); this.plugin = plugin; }
    getViewType(): string { return VIEW_TYPE_DASHBOARD; } getDisplayText(): string { return 'FSRS Decks'; } getIcon(): string { return ICON_NAME; }
    async onOpen() { this.render(); }
    render() { this.contentEl.empty(); this.contentEl.style.padding = "var(--size-4-4)"; this.renderHeader(); this.renderDecks(); }
    private renderHeader() {
        const headerEl = this.contentEl.createDiv(); const setting = new Setting(headerEl).setName("Flashcard Decks").setHeading();
        setting.addExtraButton(btn => btn.setIcon('bar-chart-3').setTooltip('View Statistics').onClick(() => new StatsModal(this.app, this.plugin).open()));
        setting.addExtraButton(btn => btn.setIcon('filter').setTooltip('Custom Study Session').onClick(() => new CustomStudyModal(this.app, this.plugin).open()));
        
        // Manual sync button
        const pouchDB = this.plugin.dataManager.getPouchDB();
        if (this.plugin.settings.syncEnabled && pouchDB) {
            setting.addExtraButton(btn => {
                btn.setIcon('refresh-ccw')
                    .setTooltip('Manual Sync')
                    .onClick(async () => {
                        // Check if sync is already in progress
                        if (pouchDB.isSyncing()) {
                            new Notice('Sync already in progress...');
                            return;
                        }
                        
                        try {
                            btn.setDisabled(true);
                            btn.setIcon('loader');
                            
                            const notice = new Notice('Syncing...', 0);
                            
                            // Track sync progress
                            let docsWritten = 0;
                            pouchDB.onSyncChange((info) => {
                                docsWritten += info.change.docs_written;
                                notice.setMessage(`Syncing... (${docsWritten} changes)`);
                            });
                            
                            await pouchDB.manualSync();
                            
                            notice.hide();
                            const status = await pouchDB.getSyncStatus();
                            new Notice(`Sync completed! Last: ${status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleString() : 'Now'}`, 3000);
                            
                        } catch (error) {
                            new Notice(`Sync failed: ${error.message}`, 5000);
                        } finally {
                            btn.setDisabled(false);
                            btn.setIcon('refresh-ccw');
                        }
                    });
            });
        }
        
        setting.addExtraButton(btn => btn.setIcon('refresh-cw').setTooltip('Refresh decks from vault').onClick(async () => { new Notice('Refreshing decks...'); await this.plugin.dataManager.buildIndex(); this.render(); new Notice('Decks refreshed!'); }));
        const decks = this.plugin.dataManager.getDecks(); const globalStats = decks.reduce((acc, deck) => { acc.new += deck.stats.new; acc.due += deck.stats.due; acc.total += deck.cardIds.size; return acc; }, { new: 0, due: 0, total: 0 });
        const statsContainer = this.contentEl.createDiv({ cls: 'fsrs-global-stats' }); statsContainer.createEl('p', { text: `Total Cards: ${globalStats.total}` }); statsContainer.createEl('p', { text: `Due: ` }).createEl('span', { text: `${globalStats.due}`, attr: { style: 'color: var(--color-red); font-weight: bold;' } }); statsContainer.createEl('p', { text: `New: ` }).createEl('span', { text: `${globalStats.new}`, attr: { style: 'color: var(--color-blue); font-weight: bold;' } });
    }
    private renderDecks() {
        const decks = this.plugin.dataManager.getDecks();
        if (decks.length === 0) { this.renderEmptyState(); return; }
        decks.forEach(deck => {
            const total = deck.cardIds.size;
            const setting = new Setting(this.contentEl)
                .setName(deck.title)
                .setDesc(`Due: ${deck.stats.due} • New: ${deck.stats.new} • Total: ${total}`);

            setting.nameEl.style.cursor = "pointer";
            setting.nameEl.addEventListener('click', () => {
                this.app.workspace.openLinkText(deck.filePath, deck.filePath);
            });

            const buttonContainer = setting.controlEl.createDiv();
            buttonContainer.style.display = 'flex';
            buttonContainer.style.flexDirection = 'column';
            buttonContainer.style.gap = 'var(--size-4-1)';

            new ButtonComponent(buttonContainer)
                .setButtonText('Study Now')
                .setCta()
                .onClick(() => {
                    const queue = this.plugin.dataManager.getReviewQueue(deck.id);
                    if (queue.length === 0) {
                        new Notice('No cards to review in this deck!');
                        return;
                    }
                    new ReviewModal(this.app, this.plugin, queue).open();
                });

            new ButtonComponent(buttonContainer)
                .setButtonText('Cram Mode')
                .setTooltip('Study ALL cards (ignores daily limits) - perfect for exam prep')
                .onClick(() => {
                    const queue = this.plugin.dataManager.getAllCardsForStudy(deck.id);
                    if (queue.length === 0) {
                        new Notice('No cards in this deck!');
                        return;
                    }
                    new Notice(`Cram Mode: Studying all ${queue.length} cards`);
                    new ReviewModal(this.app, this.plugin, queue).open();
                });

            new ButtonComponent(buttonContainer)
                .setButtonText('Browse')
                .onClick(() => {
                    const cards = this.plugin.dataManager.getCardsByDeck(deck.id);
                    if (cards.length === 0) {
                        new Notice('This deck has no cards to browse.');
                        return;
                    }
                    new BrowseModal(this.app, this.plugin, cards).open();
                });
        });
    }
    private renderEmptyState() { const emptyStateEl = this.contentEl.createDiv({ cls: 'fsrs-empty-state' }); emptyStateEl.createEl('h2', { text: 'No Decks Found' }); emptyStateEl.createEl('p', { text: `Create a new note and add the tag #${this.plugin.settings.deckTag} to get started.` }); }
}

// --- UI: BROWSE MODAL ---
class BrowseModal extends Modal {
    private plugin: FSRSFlashcardsPlugin;
    private cards: Card[];
    private currentCardIndex = 0;

    private cardContainer: HTMLElement;
    private frontEl: HTMLElement;
    private backEl: HTMLElement;
    private answerContainer: HTMLElement;
    private prevButton: ButtonComponent;
    private nextButton: ButtonComponent;

    constructor(app: App, plugin: FSRSFlashcardsPlugin, cards: Card[]) {
        super(app);
        this.plugin = plugin;
        this.cards = cards;
        this.modalEl.addClass('fsrs-review-modal');
    }

    onOpen() {
        this.containerEl.addClass('fsrs-review-modal-immersive');
        this.contentEl.empty();
        this.contentEl.style.overflow = 'hidden';
        this.setupUI();
        this.displayCurrentCard();
        this.scope.register([], 'keydown', this.handleKeyPress.bind(this));
    }
private setupUI() {
        const container = this.contentEl.createDiv({ cls: 'fsrs-review-container' });
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = 'var(--size-4-4)';
        container.style.height = '100%';

        const leftControl = container.createDiv();
        this.prevButton = new ButtonComponent(leftControl)
            .setIcon('arrow-left')
            .setTooltip('Previous card (Left arrow)')
            .onClick(() => this.showPrevCard());

        const cardWrapper = container.createDiv();
        cardWrapper.style.flex = '1';
        cardWrapper.style.overflowY = 'auto';
        cardWrapper.style.maxHeight = '100%';

        this.cardContainer = cardWrapper.createDiv({ cls: 'fsrs-review-card' });
        this.cardContainer.style.fontSize = `${this.plugin.settings.fontSize}px`;
        this.frontEl = this.cardContainer.createDiv({ cls: 'fsrs-card-front' });
        this.answerContainer = this.cardContainer.createDiv({ cls: 'fsrs-card-answer' });
        this.answerContainer.createEl('hr');
        this.backEl = this.answerContainer.createDiv({ cls: 'fsrs-card-back' });

        const rightControl = container.createDiv();
        this.nextButton = new ButtonComponent(rightControl)
            .setIcon('arrow-right')
            .setTooltip('Next card (Right arrow)')
            .onClick(() => this.showNextCard());
    }

    private displayCurrentCard() {
        const card = this.cards[this.currentCardIndex];
        this.titleEl.setText(`Browsing (${this.currentCardIndex + 1}/${this.cards.length})`);

        this.frontEl.empty();
        this.backEl.empty();
        MarkdownRenderer.render(this.app, card.front, this.frontEl, card.filePath, this.plugin);
        MarkdownRenderer.render(this.app, card.back, this.backEl, card.filePath, this.plugin);

        this.updateNavButtons();
    }

    private showPrevCard() {
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
            this.displayCurrentCard();
        }
    }

    private showNextCard() {
        if (this.currentCardIndex < this.cards.length - 1) {
            this.currentCardIndex++;
            this.displayCurrentCard();
        }
    }

    private updateNavButtons() {
        this.prevButton.setDisabled(this.currentCardIndex === 0);
        this.nextButton.setDisabled(this.currentCardIndex === this.cards.length - 1);
    }

    private handleKeyPress(evt: KeyboardEvent) {
        evt.preventDefault();
        switch (evt.key) {
            case 'ArrowLeft':
                this.showPrevCard();
                break;
            case 'ArrowRight':
                this.showNextCard();
                break;
        }
    }
}

// --- UI: REVIEW MODAL ---
class ReviewModal extends Modal {
    private plugin: FSRSFlashcardsPlugin; private queue: Card[]; private currentCardIndex = 0; private state: 'question' | 'answer' = 'question'; private cardContainer: HTMLElement; private frontEl: HTMLElement; private backEl: HTMLElement; private answerContainer: HTMLElement; private controlsContainer: HTMLElement; private showAnswerButton: ButtonComponent;
    constructor(app: App, plugin: FSRSFlashcardsPlugin, queue: Card[]) { super(app); this.plugin = plugin; this.queue = queue; }
    onOpen() {
        this.containerEl.addClass('fsrs-review-modal-immersive');
        this.contentEl.empty();
        this.contentEl.style.overflow = 'hidden';
        this.titleEl.setText(`Reviewing (${this.currentCardIndex + 1}/${this.queue.length})`);
        this.setupUI();
        this.showNextCard();
        this.scope.register([], 'keydown', this.handleKeyPress.bind(this));
    }
    onClose() {
        this.contentEl.empty();
        this.plugin.refreshDashboardView();
    }
    private setupUI() {
        const card = this.getCurrentCard();
        this.modalEl.find('.modal-title').addEventListener('click', () => {
            const data = card.fsrsData;
            if (!data) { new Notice("This is a new card."); return; }
            const info = `Stability: ${data.stability.toFixed(2)}\nDifficulty: ${data.difficulty.toFixed(2)}\nReps: ${data.reps}\nLapses: ${data.lapses}\nDue: ${data.due.toLocaleDateString()}`;
            new Notice(info, 10000);
        });
        this.modalEl.find('.modal-title').style.cursor = 'help';

        const headerControls = this.modalEl.querySelector('.modal-header-controls');
        if (headerControls) {
            const editBtn = headerControls.createDiv({ cls: 'modal-close-button' });
            setIcon(editBtn, 'edit');
            editBtn.setAttribute('aria-label', 'Edit this card');
            editBtn.addEventListener('click', () => {
                this.app.workspace.openLinkText(card.filePath, card.filePath);
                this.close();
            });
            headerControls.prepend(editBtn);
        }

        const container = this.contentEl.createDiv({ cls: 'fsrs-review-container' });
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';

        this.cardContainer = container.createDiv({ cls: 'fsrs-review-card' });
        this.cardContainer.style.flex = '1 1 auto';
        this.cardContainer.style.overflowY = 'auto';
        this.cardContainer.style.fontSize = `${this.plugin.settings.fontSize}px`;

        this.frontEl = this.cardContainer.createDiv({ cls: 'fsrs-card-front' });
        this.answerContainer = this.cardContainer.createDiv({ cls: 'fsrs-card-answer' });
        this.answerContainer.style.display = 'none';
        this.answerContainer.createEl('hr');
        this.backEl = this.answerContainer.createDiv({ cls: 'fsrs-card-back' });

        const bottomControlsContainer = container.createDiv({ cls: 'fsrs-bottom-controls' });
        bottomControlsContainer.style.flex = '0 0 auto';
        bottomControlsContainer.style.paddingTop = 'var(--size-4-4)';

        this.showAnswerButton = new ButtonComponent(bottomControlsContainer)
            .setButtonText('Show Answer')
            .setCta()
            .onClick(() => this.showAnswer());
        this.showAnswerButton.buttonEl.style.width = '100%';
        this.showAnswerButton.buttonEl.style.marginBottom = 'var(--size-4-4)';
        this.showAnswerButton.buttonEl.style.padding = 'var(--size-4-2) var(--size-4-4)';

        this.controlsContainer = bottomControlsContainer.createDiv({ cls: 'fsrs-review-controls' });
        this.controlsContainer.style.marginTop = 'var(--size-4-4)';
        this.controlsContainer.style.display = 'none';
    }
    private createControlButtons() {
        this.controlsContainer.empty();
        this.controlsContainer.style.display = 'grid';
        this.controlsContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
        this.controlsContainer.style.gap = 'var(--size-4-2)';
        const card = this.getCurrentCard();
        const intervals = this.plugin.dataManager.getNextReviewIntervals(card);
        const createButton = (text: string, rating: Rating, interval: string) => {
            const btn = new ButtonComponent(this.controlsContainer).onClick(() => this.handleRating(rating));
            btn.buttonEl.style.flexDirection = 'column';
            btn.buttonEl.style.height = 'auto';
            btn.buttonEl.style.padding = 'var(--size-4-2)';
            btn.buttonEl.createEl('strong', { text });
            btn.buttonEl.createEl('small', { text: interval, cls: 'text-muted' });
            return btn;
        };
        createButton('Again', Rating.Again, intervals[Rating.Again]).setWarning();
        createButton('Hard', Rating.Hard, intervals[Rating.Hard]);
        createButton('Good', Rating.Good, intervals[Rating.Good]).setCta();
        createButton('Easy', Rating.Easy, intervals[Rating.Easy]);
    }
    private showNextCard() {
        if (this.currentCardIndex >= this.queue.length) { this.showCompletionScreen(); return; }
        this.state = 'question';
        const card = this.getCurrentCard();
        this.titleEl.setText(`Reviewing (${this.currentCardIndex + 1}/${this.queue.length})`);
        this.frontEl.empty();
        this.backEl.empty();
        MarkdownRenderer.render(this.app, card.front, this.frontEl, card.filePath, this.plugin);
        MarkdownRenderer.render(this.app, card.back, this.backEl, card.filePath, this.plugin);

        this.showAnswerButton.buttonEl.style.display = 'block';
        this.controlsContainer.style.display = 'none';
        this.answerContainer.style.display = 'none';
    }
    private showAnswer() {
        if (this.state === 'answer') return;
        this.createControlButtons();
        this.state = 'answer';
        this.showAnswerButton.buttonEl.style.display = 'none';
        this.controlsContainer.style.display = 'grid';
        this.answerContainer.style.display = 'block';
    }
    private handleRating(rating: Rating) {
        this.plugin.dataManager.updateCard(this.getCurrentCard(), rating);
        this.currentCardIndex++;
        this.cardContainer.style.transition = 'opacity 0.2s ease-in-out';
        this.cardContainer.style.opacity = '0';
        setTimeout(() => {
            this.showNextCard();
            this.cardContainer.style.opacity = '1';
        }, 200);
    }
    private showCompletionScreen() {
        this.contentEl.empty();
        this.titleEl.setText('Session Complete!');
        const container = this.contentEl.createDiv({ cls: 'fsrs-completion-screen' });
        container.createEl('h2', { text: 'Great work!' });
        container.createEl('p', { text: `You have completed ${this.queue.length} cards.` });
        new ButtonComponent(container).setButtonText('Return to Dashboard').setCta().onClick(() => this.close());
    }
    private handleKeyPress(evt: KeyboardEvent) {
        if (this.state === 'question' && (evt.key === ' ' || evt.key === 'Enter')) {
            evt.preventDefault();
            this.showAnswer();
        } else if (this.state === 'answer') {
            evt.preventDefault();
            switch (evt.key) {
                case '1': this.handleRating(Rating.Again); break;
                case '2': this.handleRating(Rating.Hard); break;
                case '3': this.handleRating(Rating.Good); break;
                case '4': this.handleRating(Rating.Easy); break;
            }
        }
    }
    private getCurrentCard(): Card { return this.queue[this.currentCardIndex]; }
}

// --- UI: STATS MODAL ---
class StatsModal extends Modal {
    private plugin: FSRSFlashcardsPlugin;
    private chartInstances: Chart[] = [];

    constructor(app: App, plugin: FSRSFlashcardsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        this.contentEl.empty();
        this.titleEl.setText("Statistics");
        Chart.register(...registerables);

        const stats = this.plugin.dataManager.getStats();
        new Setting(this.contentEl).setName("Reviews Today").setDesc(stats.reviewsToday.toString()).setHeading();

        // 30-Day Activity Chart
        this.contentEl.createEl('h3', { text: "30-Day Activity" });
        const activityCanvas = this.contentEl.createEl('canvas');
        const activityLabels = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        const activityChart = new Chart(activityCanvas, {
            type: 'bar',
            data: {
                labels: activityLabels,
                datasets: [{
                    label: 'Reviews per Day',
                    data: stats.activity,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                plugins: { legend: { display: false } }
            }
        });
        this.chartInstances.push(activityChart);

        // 7-Day Forecast Chart
        new Setting(this.contentEl).setName("7-Day Forecast").setDesc(`${stats.forecast.reduce((a, b) => a + b, 0)} reviews due`).setHeading();
        const forecastCanvas = this.contentEl.createEl('canvas');
        const forecastLabels = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            return d.toLocaleDateString(undefined, { weekday: 'short' });
        });
        const forecastChart = new Chart(forecastCanvas, {
            type: 'bar',
            data: {
                labels: forecastLabels,
                datasets: [{
                    label: 'Reviews Due',
                    data: stats.forecast,
                    backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                plugins: { legend: { display: false } }
            }
        });
        this.chartInstances.push(forecastChart);
    }

    onClose() {
        this.chartInstances.forEach(chart => chart.destroy());
        this.contentEl.empty();
    }
}

// --- UI: CUSTOM STUDY MODAL ---
class CustomStudyModal extends Modal {
    private plugin: FSRSFlashcardsPlugin; private tags: string = ""; private state: "new" | "due" | "learning" | "all" = "due"; private limit: number = 50; private unlimited: boolean = false;
    constructor(app: App, plugin: FSRSFlashcardsPlugin) { super(app); this.plugin = plugin; }
    onOpen() {
        this.contentEl.empty(); this.titleEl.setText("Custom Study Session");
        new Setting(this.contentEl).setName("Filter by Tags").setDesc("Comma-separated, e.g., #calculus, #chapter1").addText(text => text.setValue(this.tags).onChange(val => this.tags = val));
        new Setting(this.contentEl).setName("Filter by Card State").addDropdown(dd => dd.addOption("due", "Due").addOption("new", "New").addOption("learning", "Learning").addOption("all", "All Cards (Cram Mode)").setValue(this.state).onChange(val => this.state = val as any));
        new Setting(this.contentEl).setName("Card Limit").setDesc("Set to 0 or enable unlimited for no limit").addText(text => text.setValue(this.limit.toString()).onChange(val => this.limit = parseInt(val) || 0));
        new Setting(this.contentEl).setName("Unlimited Cards").setDesc("Ignore card limit - study all matching cards (for exam prep)").addToggle(toggle => toggle.setValue(this.unlimited).onChange(val => this.unlimited = val));
        new Setting(this.contentEl).addButton(btn => btn.setButtonText("Start Studying").setCta().onClick(() => this.startSession()));
    }
    startSession() {
        const now = new Date();
        const allCards = this.plugin.dataManager.getAllCards();
        const requiredTags = this.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

        let queue = allCards.filter(card => {
            const data = card.fsrsData;
            if (this.state !== "all") {
                const cardState = !data ? "new" : data.due <= now ? "due" : "learning";
                if (this.state !== cardState) return false;
            }
            if (requiredTags.length > 0) {
                const fileCache = this.app.metadataCache.getCache(card.filePath);
                const fileTags = (fileCache?.tags?.map(t => t.tag.toLowerCase()) || []).concat(fileCache?.frontmatter?.tags?.map((t: string) => `#${t.toLowerCase()}`) || []);
                return requiredTags.every(reqTag => fileTags.includes(reqTag));
            }
            return true;
        });
        
        if (!this.unlimited && this.limit > 0) {
            queue = queue.slice(0, this.limit);
        }

        if (queue.length === 0) { new Notice("No cards found matching your criteria."); return; }
        this.close();
        new ReviewModal(this.app, this.plugin, queue).open();
    }
}

// --- UI: SETTINGS TAB ---
class FSRSSettingsTab extends PluginSettingTab {
    plugin: FSRSFlashcardsPlugin; constructor(app: App, plugin: FSRSFlashcardsPlugin) { super(app, plugin); this.plugin = plugin; }
    display(): void { 
        const { containerEl } = this; 
        containerEl.empty(); 
        containerEl.createEl('h1', { text: 'FSRS Flashcards Settings' }); 
        
        // Database Settings
        containerEl.createEl('h2', { text: 'Database Settings' });
        
        new Setting(containerEl)
            .setName('Use PouchDB (IndexedDB)')
            .setDesc('Use PouchDB for local storage instead of JSON files. Better performance for large collections (10k+ cards).')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.usePouchDB)
                .onChange(async (value) => {
                    this.plugin.settings.usePouchDB = value;
                    await this.plugin.saveSettings();
                    new Notice('Please reload Obsidian for this change to take effect');
                }));
        
        new Setting(containerEl)
            .setName('Migrate to PouchDB')
            .setDesc('Convert your existing data.json to PouchDB format. (Requires PouchDB to be enabled)')
            .setDisabled(!this.plugin.settings.usePouchDB)
            .addButton(btn => btn
                .setButtonText('Migrate Now')
                .setCta()
                .onClick(async () => {
                    await this.migrateData();
                }));
        
        // Sync Settings
        containerEl.createEl('h2', { text: 'Sync Settings' });
        
        new Setting(containerEl)
            .setName('Enable Sync')
            .setDesc('Sync your flashcard data with a CouchDB server')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.syncEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.syncEnabled = value;
                    await this.plugin.saveSettings();
                    
                    if (value && this.plugin.dataManager['pouchDB']) {
                        await this.setupSync();
                    } else if (!value && this.plugin.dataManager['pouchDB']) {
                        await this.plugin.dataManager['pouchDB'].stopSync();
                        new Notice('Sync disabled');
                    }
                }));
        
        new Setting(containerEl)
            .setName('CouchDB Server URL')
            .setDesc('Your CouchDB server URL (e.g., https://your-server.com:5984/neuralcard)')
            .addText(text => text
                .setPlaceholder('https://your-server.com:5984/neuralcard')
                .setValue(this.plugin.settings.syncUrl)
                .onChange(async (value) => {
                    this.plugin.settings.syncUrl = value.trim();
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Database Name')
            .setDesc('The name of the database on your CouchDB server')
            .addText(text => text
                .setPlaceholder('neuralcard')
                .setValue(this.plugin.settings.syncDbName)
                .onChange(async (value) => {
                    this.plugin.settings.syncDbName = value.trim() || 'neuralcard';
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Username')
            .setDesc('CouchDB username for authentication')
            .addText(text => text
                .setPlaceholder('admin')
                .setValue(this.plugin.settings.syncUsername)
                .onChange(async (value) => {
                    this.plugin.settings.syncUsername = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Password')
            .setDesc('CouchDB password (stored securely)')
            .addText(text => {
                text.setPlaceholder('Enter password')
                    .setValue(this.plugin.settings.syncPassword)
                    .onChange(async (value) => {
                        this.plugin.settings.syncPassword = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = 'password';
                return text;
            });
        
        if (this.plugin.settings.syncEnabled && this.plugin.dataManager['pouchDB']) {
            new Setting(containerEl)
                .setName('Sync Status')
                .setDesc('Check your current sync status')
                .addButton(btn => btn
                    .setButtonText('Check Status')
                    .onClick(async () => {
                        const pouchDB = this.plugin.dataManager['pouchDB'];
                        if (pouchDB) {
                            const status = await pouchDB.getSyncStatus();
                            const info = await pouchDB.getDatabaseInfo();
                            new Notice(`Sync: ${status.enabled ? 'Active' : 'Inactive'}\nDocs: ${info.doc_count}\nLast Sync: ${status.lastSyncTime || 'Never'}`, 10000);
                        }
                    }));
        }
        
        new Setting(containerEl).setName('Deck Tag').setDesc('The tag to identify deck files (e.g., "flashcards" for #flashcards).').addText(text => text.setPlaceholder('flashcards').setValue(this.plugin.settings.deckTag).onChange(async (value) => { this.plugin.settings.deckTag = value.trim(); await this.plugin.saveSettings(); await this.plugin.dataManager.buildIndex(); this.plugin.refreshDashboardView(); })); 
        containerEl.createEl('h2', { text: 'Global Review Settings' }); new Setting(containerEl).setName('Max new cards per day').setDesc("Applies to all decks.").addText(text => text.setValue(this.plugin.settings.newCardsPerDay.toString()).onChange(async (value) => { const num = parseInt(value, 10); if (!isNaN(num) && num >= 0) { this.plugin.settings.newCardsPerDay = num; await this.plugin.saveSettings(); } })); new Setting(containerEl).setName('Max reviews per day').setDesc("Applies to all decks.").addText(text => text.setValue(this.plugin.settings.reviewsPerDay.toString()).onChange(async (value) => { const num = parseInt(value, 10); if (!isNaN(num) && num >= 0) { this.plugin.settings.reviewsPerDay = num; await this.plugin.saveSettings(); } })); containerEl.createEl('h2', { text: 'Appearance' }); new Setting(containerEl).setName('Review font size').addSlider(slider => slider.setLimits(12, 32, 1).setValue(this.plugin.settings.fontSize).setDynamicTooltip().onChange(async (value) => { this.plugin.settings.fontSize = value; await this.plugin.saveSettings(); })); containerEl.createEl('h2', { text: 'FSRS Parameters' }); containerEl.createEl('p', { text: 'These settings control the scheduling algorithm. Only change them if you know what you are doing.', cls: 'setting-item-description' }); new Setting(containerEl).setName('Reset FSRS Parameters').setDesc('Reset to FSRS defaults.').addButton(btn => btn.setButtonText('Reset').setWarning().onClick(async () => { this.plugin.settings.fsrsParams = generatorParameters(); await this.plugin.saveSettings(); this.plugin.dataManager.updateFsrsParameters(this.plugin.settings.fsrsParams); this.display(); })); new Setting(containerEl).setName('Request Retention').setDesc('The desired retention rate (0.7 to 0.99).').addText(text => text.setValue(this.plugin.settings.fsrsParams.request_retention.toString()).onChange(async (value) => { const num = parseFloat(value); if (!isNaN(num) && num > 0 && num < 1) { this.plugin.settings.fsrsParams.request_retention = num; await this.plugin.saveSettings(); this.plugin.dataManager.updateFsrsParameters(this.plugin.settings.fsrsParams); } })); new Setting(containerEl).setName('Maximum Interval').setDesc('The maximum number of days between reviews.').addText(text => text.setValue(this.plugin.settings.fsrsParams.maximum_interval.toString()).onChange(async (value) => { const num = parseInt(value, 10); if (!isNaN(num) && num > 0) { this.plugin.settings.fsrsParams.maximum_interval = num; await this.plugin.saveSettings(); this.plugin.dataManager.updateFsrsParameters(this.plugin.settings.fsrsParams); } }));         new Setting(containerEl).setName('FSRS Weights').setDesc('Comma-separated FSRS weights (17 values).').addTextArea(text => { text.setValue(this.plugin.settings.fsrsParams.w.join(', ')).onChange(async (value) => { try { const weights = value.split(',').map(v => parseFloat(v.trim())); if (weights.length === 17 && weights.every(w => !isNaN(w))) { this.plugin.settings.fsrsParams.w = weights; await this.plugin.saveSettings(); this.plugin.dataManager.updateFsrsParameters(this.plugin.settings.fsrsParams); } } catch (e) { console.error("Invalid FSRS weights format", e); } }); text.inputEl.rows = 5; text.inputEl.style.width = '100%'; }); }
    
    async migrateData() {
        const pouchDB = this.plugin.dataManager['pouchDB'];
        if (!pouchDB) {
            new Notice('PouchDB is not enabled');
            return;
        }
        
        try {
            new Notice('Starting migration... This may take a while for large collections.');
            
            // Load legacy data
            const legacyData = await this.plugin.loadData();
            if (!legacyData) {
                new Notice('No legacy data found to migrate');
                return;
            }
            
            // Build deck mapping
            const deckMapping: Record<string, { deckId: string; filePath: string }> = {};
            for (const card of this.plugin.dataManager.getAllCards()) {
                deckMapping[card.id] = {
                    deckId: card.deckId,
                    filePath: card.filePath
                };
            }
            
            // Perform migration
            const migration = new DataMigration(pouchDB);
            await migration.migrateFromLegacy(legacyData, deckMapping);
            
            // Verify migration
            const verification = await migration.verifyMigration(legacyData);
            
            if (verification.success) {
                new Notice(`Migration successful! Migrated ${verification.stats.migratedCards} cards and ${verification.stats.migratedLogs} reviews.`);
                this.plugin.settings.usePouchDB = true;
                await this.plugin.saveSettings();
                this.display();
            } else {
                new Notice(`Migration completed with errors: ${verification.errors.join(', ')}`, 10000);
            }
            
        } catch (error) {
            console.error('Migration failed:', error);
            new Notice(`Migration failed: ${error.message}`);
        }
    }
    
    async setupSync() {
        const pouchDB = this.plugin.dataManager['pouchDB'];
        if (!pouchDB) {
            new Notice('PouchDB is not enabled');
            return;
        }
        
        if (!this.plugin.settings.syncUrl) {
            new Notice('Please enter a CouchDB server URL first');
            return;
        }
        
        if (!this.plugin.settings.syncUsername || !this.plugin.settings.syncPassword) {
            new Notice('Please enter both username and password');
            return;
        }
        
        try {
            new Notice('Setting up sync...');
            const syncUrl = this.buildAuthenticatedUrl(
                this.plugin.settings.syncUrl,
                this.plugin.settings.syncDbName,
                this.plugin.settings.syncUsername,
                this.plugin.settings.syncPassword
            );
            await pouchDB.setupSync(syncUrl);
            new Notice('Sync enabled successfully!');
        } catch (error) {
            console.error('Sync setup failed:', error);
            new Notice(`Sync setup failed: ${error.message}`);
            this.plugin.settings.syncEnabled = false;
            await this.plugin.saveSettings();
        }
    }
    
    private buildAuthenticatedUrl(url: string, dbName: string, username: string, password: string): string {
        try {
            // Ensure URL ends with /
            if (!url.endsWith('/')) {
                url += '/';
            }
            
            const urlObj = new URL(url);
            
            // Append database name
            // Remove leading slash from dbName if present to avoid double slashes
            const cleanDbName = dbName.startsWith('/') ? dbName.substring(1) : dbName;
            
            // If pathname is just /, replace it. If it has a path, append to it.
            if (urlObj.pathname === '/' || urlObj.pathname === '') {
                 urlObj.pathname = '/' + cleanDbName;
            } else if (!urlObj.pathname.endsWith('/' + cleanDbName)) {
                 // Avoid appending if already present
                 if (urlObj.pathname.endsWith('/')) {
                     urlObj.pathname += cleanDbName;
                 } else {
                     urlObj.pathname += '/' + cleanDbName;
                 }
            }
            
            if (username && password) {
                urlObj.username = encodeURIComponent(username);
                urlObj.password = encodeURIComponent(password);
            }
            
            return urlObj.toString();
        } catch (error) {
            console.error('Failed to build authenticated URL:', error);
            return url;
        }
    }
}

// --- MAIN PLUGIN CLASS ---
export default class FSRSFlashcardsPlugin extends Plugin {
    settings: FSRSSettings; dataManager: DataManager;
    async onload() {
        console.log('Loading FSRS Flashcards plugin');
        this.addStyle();
        await this.loadSettings();
        this.dataManager = new DataManager(this);
        await this.dataManager.load();
        
        // Initialize sync if enabled
        await this.dataManager.initializeSync();
        
        this.addSettingTab(new FSRSSettingsTab(this.app, this));
        this.registerView(VIEW_TYPE_DASHBOARD, (leaf) => new DashboardView(leaf, this));
        this.addCommand({ id: 'add-fsrs-flashcard', name: 'FSRS: Add a new flashcard', editorCallback: (editor: Editor) => { const blockId = generateBlockId(); const template = `\n\n---card--- ^${blockId}\n\n---\n\n`; const cursor = editor.getCursor(); editor.replaceRange(template, cursor); editor.setCursor({ line: cursor.line + 3, ch: 0 }); } });
        this.addCommand({ id: 'open-fsrs-dashboard', name: 'Open Decks Dashboard', callback: () => this.activateView() });
        
        // Add sync commands
        if (this.settings.usePouchDB) {
            this.addCommand({
                id: 'sync-now',
                name: 'Sync Now',
                callback: async () => {
                    if (!this.settings.syncEnabled) {
                        new Notice('Sync is not enabled. Enable it in settings.');
                        return;
                    }
                    if (!this.settings.syncUrl) {
                        new Notice('Sync URL not configured. Set it in settings.');
                        return;
                    }
                    new Notice('Syncing...');
                    await this.dataManager.initializeSync();
                }
            });
            
            this.addCommand({
                id: 'check-sync-status',
                name: 'Check Sync Status',
                callback: async () => {
                    const pouchDB = this.dataManager.getPouchDB();
                    if (!pouchDB) {
                        new Notice('PouchDB is not enabled');
                        return;
                    }
                    const status = await pouchDB.getSyncStatus();
                    const info = await pouchDB.getDatabaseInfo();
                    new Notice(`Sync Status:\n${status.enabled ? '✓ Active' : '✗ Inactive'}\nURL: ${status.remoteUrl || 'Not set'}\nDocuments: ${info.doc_count}\nLast Sync: ${status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleString() : 'Never'}`, 10000);
                }
            });
        }
        
        const debouncedRefresh = debounce(() => { this.dataManager.recalculateAllDeckStats(); this.refreshDashboardView(); }, 500, true);
        const updateAndRefresh = async (file: TFile) => { await this.dataManager.updateFile(file); debouncedRefresh(); };
        this.registerEvent(this.app.vault.on('create', (file) => file instanceof TFile && updateAndRefresh(file)));
        this.registerEvent(this.app.vault.on('modify', (file) => file instanceof TFile && updateAndRefresh(file)));
        this.registerEvent(this.app.vault.on('delete', async (file) => { if (file instanceof TFile) { this.dataManager.removeDeck(this.dataManager['getDeckId'](file.path)); debouncedRefresh(); } }));
        this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => { if (file instanceof TFile) { await this.dataManager.renameDeck(file, oldPath); debouncedRefresh(); } }));
        
        // Refresh dashboard view to ensure sync button appears if enabled
        this.refreshDashboardView();
    }
    async onunload() {
        // Stop sync gracefully
        await this.dataManager.stopSync();
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
        this.removeStyle();
    }
    addStyle() {
        const css = `
            .fsrs-review-modal-immersive.modal-container .modal-bg {
                background-color: var(--background-primary);
                opacity: 1;
            }
            .fsrs-review-modal-immersive.modal-container .modal {
                max-width: 100vw;
                width: 100vw;
                height: 100vh;
                max-height: 100vh;
                border-radius: 0;
            }
            .fsrs-review-modal-immersive .modal-header-controls {
                display: flex;
                flex-direction: row-reverse;
                align-items: center;
                gap: var(--size-4-2);
            }
            .fsrs-review-card {
                border: 1px solid var(--background-modifier-border);
                border-radius: var(--radius-m);
                box-shadow: var(--shadow-s);
                background-color: var(--background-primary);
                padding: var(--size-4-4);
                margin: var(--size-4-4) auto;
                max-width: 600px;
            }
        `;
        const styleEl = document.createElement('style');
        styleEl.id = 'fsrs-flashcards-styles';
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
    }
    removeStyle() {
        const styleEl = document.getElementById('fsrs-flashcards-styles');
        if (styleEl) {
            styleEl.remove();
        }
    }
    async loadSettings() { const data: PluginData | null = await this.loadData(); this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings); this.settings.fsrsParams = Object.assign({}, DEFAULT_SETTINGS.fsrsParams, this.settings.fsrsParams); }
    async saveSettings() { 
        // Save settings to data.json
        const data: PluginData | null = await this.loadData();
        await this.saveData({ 
            settings: this.settings, 
            cardData: data?.cardData || {},
            reviewHistory: data?.reviewHistory || []
        });
    }
    async activateView() { const { workspace } = this.app; let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0]; if (leaf) { workspace.revealLeaf(leaf); return; } leaf = workspace.getRightLeaf(false) || workspace.getLeaf(true); await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true }); workspace.revealLeaf(leaf); }
    refreshDashboardView() { const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0]; if (leaf?.view instanceof DashboardView) { (leaf.view as DashboardView).render(); } }
}
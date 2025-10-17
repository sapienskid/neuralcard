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
interface FSRSSettings { deckTag: string; newCardsPerDay: number; reviewsPerDay: number; fontSize: number; fsrsParams: FSRSParameters; }
const DEFAULT_SETTINGS: FSRSSettings = { deckTag: 'flashcards', newCardsPerDay: 20, reviewsPerDay: 200, fontSize: 18, fsrsParams: generatorParameters() };

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

    constructor(plugin: FSRSFlashcardsPlugin) { this.plugin = plugin; this.fsrs = new FSRS(plugin.settings.fsrsParams); }
    async load() {
        const data: PluginData | null = await this.plugin.loadData();
        const cardData = data?.cardData || {};
        for (const cardId in cardData) { const card = cardData[cardId]; if (card.due) card.due = new Date(card.due); if (card.last_review) card.last_review = new Date(card.last_review); }
        this.fsrsDataStore = cardData;
        this.reviewHistory = data?.reviewHistory || [];
        await this.buildIndex();
    }
    async save() { await this.plugin.saveData({ settings: this.plugin.settings, cardData: this.fsrsDataStore, reviewHistory: this.reviewHistory }); }
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
    getReviewQueue(deckId: string): Card[] { const deck = this.decks.get(deckId); if (!deck) return []; const now = new Date(); const allCards = Array.from(deck.cardIds).map(id => this.cards.get(id)!).filter(Boolean); const dueCards = allCards.filter(c => c.fsrsData && c.fsrsData.state !== State.New && c.fsrsData.due <= now).sort((a, b) => a.fsrsData!.due.getTime() - b.fsrsData!.due.getTime()); const newCards = allCards.filter(c => !c.fsrsData || c.fsrsData.state === State.New); return [...dueCards.slice(0, this.plugin.settings.reviewsPerDay), ...newCards.slice(0, this.plugin.settings.newCardsPerDay)]; }
    updateCard(card: Card, rating: Rating) { const now = new Date(); const fsrsCard = card.fsrsData || { due: now, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: State.New, learning_steps: 0 }; const scheduling_cards = this.fsrs.repeat(fsrsCard, now); const newFsrsData = scheduling_cards[rating as Exclude<Rating, Rating.Manual>].card; this.fsrsDataStore[card.id] = newFsrsData; card.fsrsData = newFsrsData; this.reviewHistory.push({ cardId: card.id, timestamp: now.getTime(), rating }); this.save(); }
    getNextReviewIntervals(card: Card): Record<Exclude<Rating, Rating.Manual>, string> { const now = new Date(); const fsrsCard = card.fsrsData || { due: now, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: State.New, learning_steps: 0 }; const scheduling_cards = this.fsrs.repeat(fsrsCard, now); const formatInterval = (days: number): string => { if (days < 1) return "<1d"; if (days < 30) return `${Math.round(days)}d`; if (days < 365) return `${(days / 30).toFixed(1)}m`; return `${(days / 365).toFixed(1)}y`; }; return { [Rating.Again]: formatInterval(scheduling_cards[Rating.Again].card.scheduled_days), [Rating.Hard]: formatInterval(scheduling_cards[Rating.Hard].card.scheduled_days), [Rating.Good]: formatInterval(scheduling_cards[Rating.Good].card.scheduled_days), [Rating.Easy]: formatInterval(scheduling_cards[Rating.Easy].card.scheduled_days), }; }
    getStats() { const now = new Date(); const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); const reviewsToday = this.reviewHistory.filter(log => log.timestamp >= todayStart); const activity = new Array(30).fill(0); this.reviewHistory.forEach(log => { const daysAgo = Math.floor((now.getTime() - log.timestamp) / (1000 * 60 * 60 * 24)); if (daysAgo < 30) activity[29 - daysAgo]++; }); const forecast = new Array(7).fill(0); let mature = 0, learning = 0, young = 0, total = 0; for(const card of this.cards.values()) { const data = this.fsrsDataStore[card.id]; if (data) { total++; if (data.due <= now) { const daysForward = Math.floor((data.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); if (daysForward < 7 && daysForward >= 0) forecast[daysForward]++; } if (data.stability >= 21) mature++; else if (data.state === State.Review) young++; else learning++; } } return { reviewsToday: reviewsToday.length, activity, forecast, maturity: { mature, young, learning, new: this.cards.size - total } }; }
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
        setting.addExtraButton(btn => btn.setIcon('refresh-cw').setTooltip('Refresh decks from vault').onClick(async () => { new Notice('Refreshing decks...'); await this.plugin.dataManager.buildIndex(); this.render(); new Notice('Decks refreshed!'); }));
        const decks = this.plugin.dataManager.getDecks(); const globalStats = decks.reduce((acc, deck) => { acc.new += deck.stats.new; acc.due += deck.stats.due; acc.total += deck.cardIds.size; return acc; }, { new: 0, due: 0, total: 0 });
        const statsContainer = this.contentEl.createDiv({ cls: 'fsrs-global-stats' }); statsContainer.createEl('p', { text: `Total Cards: ${globalStats.total}`}); statsContainer.createEl('p', { text: `Due: `}).createEl('span', { text: `${globalStats.due}`, attr: { style: 'color: var(--color-red); font-weight: bold;'} }); statsContainer.createEl('p', { text: `New: `}).createEl('span', { text: `${globalStats.new}`, attr: { style: 'color: var(--color-blue); font-weight: bold;'} });
    }
    private renderDecks() { const decks = this.plugin.dataManager.getDecks(); if (decks.length === 0) { this.renderEmptyState(); return; } decks.forEach(deck => { const total = deck.cardIds.size; const setting = new Setting(this.contentEl).setName(deck.title).setDesc(`Due: ${deck.stats.due} • New: ${deck.stats.new} • Total: ${total}`).addButton(button => button.setButtonText('Study Now').setCta().onClick(() => { const queue = this.plugin.dataManager.getReviewQueue(deck.id); if (queue.length === 0) { new Notice('No cards to review in this deck!'); return; } new ReviewModal(this.app, this.plugin, queue).open(); })); setting.nameEl.style.cursor = "pointer"; setting.nameEl.addEventListener('click', () => { this.app.workspace.openLinkText(deck.filePath, deck.filePath); }); }); }
    private renderEmptyState() { const emptyStateEl = this.contentEl.createDiv({ cls: 'fsrs-empty-state' }); emptyStateEl.createEl('h2', { text: 'No Decks Found' }); emptyStateEl.createEl('p', { text: `Create a new note and add the tag #${this.plugin.settings.deckTag} to get started.` }); }
}

// --- UI: REVIEW MODAL ---
class ReviewModal extends Modal {
    private plugin: FSRSFlashcardsPlugin; private queue: Card[]; private currentCardIndex = 0; private state: 'question' | 'answer' = 'question'; private cardContainer: HTMLElement; private frontEl: HTMLElement; private backEl: HTMLElement; private answerContainer: HTMLElement; private controlsContainer: HTMLElement; private showAnswerButton: ButtonComponent;
    constructor(app: App, plugin: FSRSFlashcardsPlugin, queue: Card[]) { super(app); this.plugin = plugin; this.queue = queue; this.modalEl.addClass('fsrs-review-modal'); }
    onOpen() { this.contentEl.empty(); this.titleEl.setText(`Reviewing (${this.currentCardIndex + 1}/${this.queue.length})`); this.setupUI(); this.showNextCard(); this.scope.register([], 'keydown', this.handleKeyPress.bind(this)); }
    onClose() { this.contentEl.empty(); this.plugin.refreshDashboardView(); }
    private setupUI() { const card = this.getCurrentCard(); this.modalEl.find('.modal-title').addEventListener('click', () => { const data = card.fsrsData; if (!data) { new Notice("This is a new card."); return; } const info = `Stability: ${data.stability.toFixed(2)}\nDifficulty: ${data.difficulty.toFixed(2)}\nReps: ${data.reps}\nLapses: ${data.lapses}\nDue: ${data.due.toLocaleDateString()}`; new Notice(info, 10000); }); this.modalEl.find('.modal-title').style.cursor = 'help'; this.addExtraButton('edit', 'Edit this card', () => { this.app.workspace.openLinkText(card.filePath, card.filePath); this.close(); }); const container = this.contentEl.createDiv({ cls: 'fsrs-review-container' }); this.cardContainer = container.createDiv({ cls: 'fsrs-review-card' }); this.cardContainer.style.fontSize = `${this.plugin.settings.fontSize}px`; this.frontEl = this.cardContainer.createDiv({ cls: 'fsrs-card-front' }); this.answerContainer = this.cardContainer.createDiv({ cls: 'fsrs-card-answer', attr: { 'hidden': 'true' }}); this.answerContainer.createEl('hr'); this.backEl = this.answerContainer.createDiv({ cls: 'fsrs-card-back' }); const buttonContainer = container.createDiv({ cls: 'fsrs-button-container' }); this.showAnswerButton = new ButtonComponent(buttonContainer).setButtonText('Show Answer').setCta().onClick(() => this.showAnswer()); this.showAnswerButton.buttonEl.style.width = '100%'; this.showAnswerButton.buttonEl.style.marginBottom = 'var(--size-4-4)'; this.controlsContainer = container.createDiv({ cls: 'fsrs-review-controls', attr: { 'hidden': 'true' }}); }
    private addExtraButton(icon: string, tooltip: string, action: () => void) { const btn = this.modalEl.createDiv({ cls: 'modal-close-button' }); setIcon(btn, icon); btn.setAttribute('aria-label', tooltip); btn.addEventListener('click', action); }
    private createControlButtons() { this.controlsContainer.empty(); this.controlsContainer.style.display = 'grid'; this.controlsContainer.style.gridTemplateColumns = 'repeat(4, 1fr)'; this.controlsContainer.style.gap = 'var(--size-4-2)'; const card = this.getCurrentCard(); const intervals = this.plugin.dataManager.getNextReviewIntervals(card); const createButton = (text: string, rating: Rating, interval: string) => { const btn = new ButtonComponent(this.controlsContainer).onClick(() => this.handleRating(rating)); btn.buttonEl.style.flexDirection = 'column'; btn.buttonEl.style.height = 'auto'; btn.buttonEl.style.padding = 'var(--size-4-2)'; btn.buttonEl.createEl('strong', { text }); btn.buttonEl.createEl('small', { text: interval, cls: 'text-muted' }); return btn; }; createButton('Again', Rating.Again, intervals[Rating.Again]).setWarning(); createButton('Hard', Rating.Hard, intervals[Rating.Hard]); createButton('Good', Rating.Good, intervals[Rating.Good]).setCta(); createButton('Easy', Rating.Easy, intervals[Rating.Easy]); }
    private showNextCard() { if (this.currentCardIndex >= this.queue.length) { this.showCompletionScreen(); return; } this.state = 'question'; const card = this.getCurrentCard(); this.titleEl.setText(`Reviewing (${this.currentCardIndex + 1}/${this.queue.length})`); this.frontEl.empty(); this.backEl.empty(); MarkdownRenderer.render(this.app, card.front, this.frontEl, card.filePath, this.plugin); MarkdownRenderer.render(this.app, card.back, this.backEl, card.filePath, this.plugin); this.showAnswerButton.buttonEl.removeAttribute('hidden'); this.controlsContainer.setAttribute('hidden', 'true'); this.answerContainer.setAttribute('hidden', 'true'); this.createControlButtons(); }
    private showAnswer() { if (this.state === 'answer') return; this.state = 'answer'; this.showAnswerButton.buttonEl.setAttribute('hidden', 'true'); this.controlsContainer.removeAttribute('hidden'); this.answerContainer.removeAttribute('hidden'); }
    private handleRating(rating: Rating) { this.plugin.dataManager.updateCard(this.getCurrentCard(), rating); this.currentCardIndex++; this.cardContainer.style.transition = 'opacity 0.2s ease-in-out'; this.cardContainer.style.opacity = '0'; setTimeout(() => { this.showNextCard(); this.cardContainer.style.opacity = '1'; }, 200); }
    private showCompletionScreen() { this.contentEl.empty(); this.titleEl.setText('Session Complete!'); const container = this.contentEl.createDiv({cls: 'fsrs-completion-screen'}); container.createEl('h2', { text: 'Great work!' }); container.createEl('p', { text: `You have completed ${this.queue.length} cards.` }); new ButtonComponent(container).setButtonText('Return to Dashboard').setCta().onClick(() => this.close()); }
    private handleKeyPress(evt: KeyboardEvent) { if (this.state === 'question' && (evt.key === ' ' || evt.key === 'Enter')) { evt.preventDefault(); this.showAnswer(); } else if (this.state === 'answer') { evt.preventDefault(); switch (evt.key) { case '1': this.handleRating(Rating.Again); break; case '2': this.handleRating(Rating.Hard); break; case '3': this.handleRating(Rating.Good); break; case '4': this.handleRating(Rating.Easy); break; } } }
    private getCurrentCard(): Card { return this.queue[this.currentCardIndex]; }
}

// --- UI: STATS MODAL ---
class StatsModal extends Modal {
    private plugin: FSRSFlashcardsPlugin; constructor(app: App, plugin: FSRSFlashcardsPlugin) { super(app); this.plugin = plugin; }
    onOpen() {
        this.contentEl.empty(); this.titleEl.setText("Statistics");
        const stats = this.plugin.dataManager.getStats();
        new Setting(this.contentEl).setName("Reviews Today").setDesc(stats.reviewsToday.toString()).setHeading();
        
        this.contentEl.createEl('h3', { text: "30-Day Activity" });
        const activityContainer = this.contentEl.createDiv({ attr: { style: 'font-family: monospace; white-space: pre; line-height: 1.2;'} });
        const maxActivity = Math.max(...stats.activity, 1);
        let activityHtml = '';
        for (let i = 0; i < 30; i++) {
            const barCount = Math.ceil((stats.activity[i] / maxActivity) * 10);
            activityHtml += `|${'█'.repeat(barCount)}${' '.repeat(10 - barCount)}| ${stats.activity[i]}\n`;
        }
        activityContainer.setText(activityHtml);

        new Setting(this.contentEl).setName("7-Day Forecast").setDesc(`${stats.forecast.reduce((a, b) => a + b, 0)} reviews due`).setHeading();
        const forecastContainer = this.contentEl.createDiv({ attr: { style: 'display: flex; justify-content: space-around; text-align: center;'} });
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
            const dayWrapper = forecastContainer.createDiv();
            const day = new Date(); day.setDate(day.getDate() + i);
            dayWrapper.createDiv({ text: days[day.getDay()] });
            dayWrapper.createDiv({ text: stats.forecast[i].toString(), attr: { style: 'font-size: 1.5em; font-weight: bold;'} });
        }

        new Setting(this.contentEl).setName("Card Maturity").setDesc(`${stats.maturity.mature + stats.maturity.young + stats.maturity.learning + stats.maturity.new} total cards`).setHeading();
        const maturityContainer = this.contentEl.createDiv({ attr: { style: 'display: flex; flex-direction: column; gap: 5px;'} });
        maturityContainer.createEl('p', { text: `Mature (interval > 21d): ${stats.maturity.mature}` });
        maturityContainer.createEl('p', { text: `Young: ${stats.maturity.young}` });
        maturityContainer.createEl('p', { text: `Learning: ${stats.maturity.learning}` });
        maturityContainer.createEl('p', { text: `New: ${stats.maturity.new}` });
    }
}

// --- UI: CUSTOM STUDY MODAL ---
class CustomStudyModal extends Modal {
    private plugin: FSRSFlashcardsPlugin; private tags: string = ""; private state: "new" | "due" | "learning" = "due"; private limit: number = 50;
    constructor(app: App, plugin: FSRSFlashcardsPlugin) { super(app); this.plugin = plugin; }
    onOpen() {
        this.contentEl.empty(); this.titleEl.setText("Custom Study Session");
        new Setting(this.contentEl).setName("Filter by Tags").setDesc("Comma-separated, e.g., #calculus, #chapter1").addText(text => text.setValue(this.tags).onChange(val => this.tags = val));
        new Setting(this.contentEl).setName("Filter by Card State").addDropdown(dd => dd.addOption("due", "Due").addOption("new", "New").addOption("learning", "Learning").setValue(this.state).onChange(val => this.state = val as any));
        new Setting(this.contentEl).setName("Card Limit").addText(text => text.setValue(this.limit.toString()).onChange(val => this.limit = parseInt(val) || 50));
        new Setting(this.contentEl).addButton(btn => btn.setButtonText("Start Studying").setCta().onClick(() => this.startSession()));
    }
    startSession() {
        const now = new Date();
        const allCards = this.plugin.dataManager.getAllCards();
        const requiredTags = this.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        
        const queue = allCards.filter(card => {
            const data = card.fsrsData;
            const cardState = !data ? "new" : data.due <= now ? "due" : "learning";
            if (this.state !== cardState) return false;
            if (requiredTags.length > 0) {
                const fileCache = this.app.metadataCache.getCache(card.filePath);
                const fileTags = (fileCache?.tags?.map(t => t.tag.toLowerCase()) || []).concat(fileCache?.frontmatter?.tags?.map((t: string) => `#${t.toLowerCase()}`) || []);
                return requiredTags.every(reqTag => fileTags.includes(reqTag));
            }
            return true;
        }).slice(0, this.limit);

        if (queue.length === 0) { new Notice("No cards found matching your criteria."); return; }
        this.close();
        new ReviewModal(this.app, this.plugin, queue).open();
    }
}

// --- UI: SETTINGS TAB ---
class FSRSSettingsTab extends PluginSettingTab {
    plugin: FSRSFlashcardsPlugin; constructor(app: App, plugin: FSRSFlashcardsPlugin) { super(app, plugin); this.plugin = plugin; }
    display(): void { const { containerEl } = this; containerEl.empty(); containerEl.createEl('h1', { text: 'FSRS Flashcards Settings' }); new Setting(containerEl).setName('Deck Tag').setDesc('The tag to identify deck files (e.g., "flashcards" for #flashcards).').addText(text => text.setPlaceholder('flashcards').setValue(this.plugin.settings.deckTag).onChange(async (value) => { this.plugin.settings.deckTag = value.trim(); await this.plugin.saveSettings(); await this.plugin.dataManager.buildIndex(); this.plugin.refreshDashboardView(); })); containerEl.createEl('h2', { text: 'Global Review Settings' }); new Setting(containerEl).setName('Max new cards per day').setDesc("Applies to all decks.").addText(text => text.setValue(this.plugin.settings.newCardsPerDay.toString()).onChange(async (value) => { const num = parseInt(value, 10); if (!isNaN(num) && num >= 0) { this.plugin.settings.newCardsPerDay = num; await this.plugin.saveSettings(); } })); new Setting(containerEl).setName('Max reviews per day').setDesc("Applies to all decks.").addText(text => text.setValue(this.plugin.settings.reviewsPerDay.toString()).onChange(async (value) => { const num = parseInt(value, 10); if (!isNaN(num) && num >= 0) { this.plugin.settings.reviewsPerDay = num; await this.plugin.saveSettings(); } })); containerEl.createEl('h2', { text: 'Appearance' }); new Setting(containerEl).setName('Review font size').addSlider(slider => slider.setLimits(12, 32, 1).setValue(this.plugin.settings.fontSize).setDynamicTooltip().onChange(async (value) => { this.plugin.settings.fontSize = value; await this.plugin.saveSettings(); })); containerEl.createEl('h2', { text: 'FSRS Parameters' }); containerEl.createEl('p', { text: 'These settings control the scheduling algorithm. Only change them if you know what you are doing.', cls: 'setting-item-description' }); new Setting(containerEl).setName('Reset FSRS Parameters').setDesc('Reset to FSRS defaults.').addButton(btn => btn.setButtonText('Reset').setWarning().onClick(async () => { this.plugin.settings.fsrsParams = generatorParameters(); await this.plugin.saveSettings(); this.plugin.dataManager.updateFsrsParameters(this.plugin.settings.fsrsParams); this.display(); })); new Setting(containerEl).setName('Request Retention').setDesc('The desired retention rate (0.7 to 0.99).').addText(text => text.setValue(this.plugin.settings.fsrsParams.request_retention.toString()).onChange(async (value) => { const num = parseFloat(value); if (!isNaN(num) && num > 0 && num < 1) { this.plugin.settings.fsrsParams.request_retention = num; await this.plugin.saveSettings(); this.plugin.dataManager.updateFsrsParameters(this.plugin.settings.fsrsParams); } })); new Setting(containerEl).setName('Maximum Interval').setDesc('The maximum number of days between reviews.').addText(text => text.setValue(this.plugin.settings.fsrsParams.maximum_interval.toString()).onChange(async (value) => { const num = parseInt(value, 10); if (!isNaN(num) && num > 0) { this.plugin.settings.fsrsParams.maximum_interval = num; await this.plugin.saveSettings(); this.plugin.dataManager.updateFsrsParameters(this.plugin.settings.fsrsParams); } })); new Setting(containerEl).setName('FSRS Weights').setDesc('Comma-separated FSRS weights (17 values).').addTextArea(text => { text.setValue(this.plugin.settings.fsrsParams.w.join(', ')).onChange(async (value) => { try { const weights = value.split(',').map(v => parseFloat(v.trim())); if(weights.length === 17 && weights.every(w => !isNaN(w))) { this.plugin.settings.fsrsParams.w = weights; await this.plugin.saveSettings(); this.plugin.dataManager.updateFsrsParameters(this.plugin.settings.fsrsParams); } } catch (e) { console.error("Invalid FSRS weights format", e); } }); text.inputEl.rows = 5; text.inputEl.style.width = '100%'; }); }
}

// --- MAIN PLUGIN CLASS ---
export default class FSRSFlashcardsPlugin extends Plugin {
    settings: FSRSSettings; dataManager: DataManager;
    async onload() { console.log('Loading FSRS Flashcards plugin'); await this.loadSettings(); this.dataManager = new DataManager(this); await this.dataManager.load(); this.addSettingTab(new FSRSSettingsTab(this.app, this)); this.registerView(VIEW_TYPE_DASHBOARD, (leaf) => new DashboardView(leaf, this)); this.addRibbonIcon(ICON_NAME, 'Open FSRS Decks', () => this.activateView()); this.addCommand({ id: 'add-fsrs-flashcard', name: 'FSRS: Add a new flashcard', editorCallback: (editor: Editor) => { const blockId = generateBlockId(); const template = `\n\n---card--- ^${blockId}\n\n---\n\n`; const cursor = editor.getCursor(); editor.replaceRange(template, cursor); editor.setCursor({ line: cursor.line + 3, ch: 0 }); } }); this.addCommand({ id: 'open-fsrs-dashboard', name: 'Open Decks Dashboard', callback: () => this.activateView() }); const debouncedRefresh = debounce(() => { this.dataManager.recalculateAllDeckStats(); this.refreshDashboardView(); }, 500, true); const updateAndRefresh = async (file: TFile) => { await this.dataManager.updateFile(file); debouncedRefresh(); }; this.registerEvent(this.app.vault.on('create', (file) => file instanceof TFile && updateAndRefresh(file))); this.registerEvent(this.app.vault.on('modify', (file) => file instanceof TFile && updateAndRefresh(file))); this.registerEvent(this.app.vault.on('delete', async (file) => { if (file instanceof TFile) { this.dataManager.removeDeck(this.dataManager['getDeckId'](file.path)); debouncedRefresh(); } })); this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => { if (file instanceof TFile) { await this.dataManager.renameDeck(file, oldPath); debouncedRefresh(); } })); }
    onunload() { this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD); }
    async loadSettings() { const data: PluginData | null = await this.loadData(); this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings); this.settings.fsrsParams = Object.assign({}, DEFAULT_SETTINGS.fsrsParams, this.settings.fsrsParams); }
    async saveSettings() { await this.dataManager.save(); }
    async activateView() { const { workspace } = this.app; let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0]; if (leaf) { workspace.revealLeaf(leaf); return; } leaf = workspace.getRightLeaf(false) || workspace.getLeaf(true); await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true }); workspace.revealLeaf(leaf); }
    refreshDashboardView() { const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0]; if (leaf?.view instanceof DashboardView) { (leaf.view as DashboardView).render(); } }
}
/**
 * Search Box Component
 */
export declare class SearchBox {
    private container;
    private input;
    private results;
    private onSelect;
    private searchTimeout;
    constructor(container: HTMLElement);
    private render;
    private setupListeners;
    private performSearch;
    private showLoading;
    private clearResults;
    setResults(results: Array<{
        name: string;
        address?: string;
    }>): void;
    getQuery(): string;
    setQuery(query: string): void;
    clear(): void;
    onResultSelect(callback: (query: string) => void): void;
}
//# sourceMappingURL=SearchBox.d.ts.map
/**
 * Search Box Component
 */

import geocodingService from '../services/geocoding';

export class SearchBox {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private results: HTMLDivElement;
  private onSelect: (query: string) => void = () => {};
  private searchTimeout: NodeJS.Timeout | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.input = container.querySelector('.search-input') as HTMLInputElement;
    this.results = container.querySelector('.search-results') as HTMLDivElement;
    this.setupListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="search-box">
        <div class="search-input-wrapper">
          <input
            type="text"
            class="search-input"
            placeholder="Search location or address..."
            aria-label="Search location"
          />
          <button class="search-clear" title="Clear search">✕</button>
        </div>
        <div class="search-results"></div>
      </div>
    `;
  }

  private setupListeners(): void {
    const clearBtn = this.container.querySelector('.search-clear') as HTMLButtonElement;
    clearBtn.addEventListener('click', () => this.clear());

    this.input.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      if (value.length > 2) {
        this.showLoading();
        // Debounce the search
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(() => {
          this.performSearch(value);
        }, 300);
      } else {
        this.clearResults();
      }
    });
  }

  private async performSearch(query: string): Promise<void> {
    try {
      const results = await geocodingService.searchPlaces(query);
      if (results && results.length > 0) {
        this.setResults(results);
      } else {
        this.results.innerHTML = '<div class="search-no-results">No results found</div>';
      }
    } catch (error) {
      console.error('Search error:', error);
      this.results.innerHTML = '<div class="search-error">Search failed</div>';
    }
  }

  private showLoading(): void {
    this.results.innerHTML = '<div class="search-loading">Searching...</div>';
  }

  private clearResults(): void {
    this.results.innerHTML = '';
  }

  public setResults(results: Array<{ name: string; address?: string }>): void {
    this.results.innerHTML = results
      .map(
        (result, idx) => `
        <div class="search-result" data-index="${idx}">
          <div class="result-name">${result.name}</div>
          <div class="result-address">${result.address || ''}</div>
        </div>
      `
      )
      .join('');

    this.results.querySelectorAll('.search-result').forEach((el) => {
      el.addEventListener('click', (e) => {
        const index = parseInt((el as HTMLElement).dataset.index || '0');
        this.onSelect(results[index].name);
        this.clear();
      });
    });
  }

  public getQuery(): string {
    return this.input.value;
  }

  public setQuery(query: string): void {
    this.input.value = query;
  }

  public clear(): void {
    this.input.value = '';
    this.clearResults();
  }

  public onResultSelect(callback: (query: string) => void): void {
    this.onSelect = callback;
  }
}

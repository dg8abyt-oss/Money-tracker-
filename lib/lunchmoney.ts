export interface LMCategory {
  id: number;
  name: string;
  description: string | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  archived: boolean;
  group_id: number | null;
}

export interface LMTransaction {
  id: number;
  date: string;
  payee: string;
  amount: string; // usually represented as a string for exactness
  currency: string;
  notes: string | null;
  category_id: number | null;
  asset_id: number | null;
  plaid_account_id: number | null;
  status: string;
  is_group: boolean;
  group_id: number | null;
  tags: { id: number; name: string }[] | null;
  external_id: string | null;
  original_name: string;
}

export interface LMAsset {
  id: number;
  type_name: string;
  subtype_name: string | null;
  name: string;
  balance: string;
  balance_as_of: string;
  currency: string;
  closed_on: string | null;
}

export interface LMPlaidAccount {
  id: number;
  name: string;
  balance: string;
  balance_last_update: string;
  type: string;
  subtype: string;
  status: string;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export class LunchMoney {
  private token: string;
  private baseUrl = 'https://dev.lunchmoney.app/v1';

  constructor(token: string) {
    if (!token) {
      throw new Error('Lunch Money Access Token is required');
    }
    this.token = token;
  }

  private async request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...init } = options;
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
      });
    }

    const res = await fetch(url.toString(), {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`LunchMoney API Error [${res.status}]: ${text}`);
      throw new Error(`LunchMoney API Error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  async getCategories() {
    const data = await this.request<{ categories: LMCategory[] }>('/categories');
    return data.categories;
  }

  async getTransactions(startDate: string, endDate: string) {
    const data = await this.request<{ transactions: LMTransaction[] }>('/transactions', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
      next: { revalidate: 60 } // small cache to prevent API rate limits during dev
    } as any);
    return data.transactions;
  }

  async getAssets() {
    const data = await this.request<{ assets: LMAsset[] }>('/assets');
    return data.assets;
  }

  async getPlaidAccounts() {
    try {
        const data = await this.request<{ plaid_accounts: LMPlaidAccount[] }>('/plaid_accounts');
        return data.plaid_accounts;
    } catch (e) {
        // Return empty array if plausible endpoint doesn't exist or is not authorized
        return [];
    }
  }
}

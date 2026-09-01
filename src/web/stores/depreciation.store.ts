import { create } from 'zustand';
import { apiFetch } from '../lib/api';

export interface Company {
  id: string;
  name: string;
  tradeName?: string | null;
  document?: string | null;
  cnpj?: string | null;
  state?: string | null;
  city?: string | null;
  depreciationRule?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  defaultRate: number;
  companyId?: string | null;
}

export interface Asset {
  id: string;
  companyId: string;
  supplier: string;
  acquisitionDate: string;
  documentNumber: string;
  description: string;
  acquisitionValue: number; // centavos
  ncm?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  annualRate: number;
  status?: 'ACTIVE' | 'DISPOSED';
  disposedAt?: string | null;
  disposedReason?: string | null;
  createdAt: string;
}

interface DepreciationState {
  companies: Company[];
  selectedCompanyId: string | null;
  categories: Category[];
  assets: Asset[];
  competence: string; // YYYY-MM
  isLoading: boolean;
  
  // Actions
  fetchCompanies: () => Promise<void>;
  selectCompany: (id: string | null) => void;
  createCompany: (data: any) => Promise<any>;
  updateCompany: (id: string, data: any) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  fetchCategories: () => Promise<void>;
  createCategory: (data: any) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  fetchAssets: () => Promise<void>;
  createAsset: (data: any) => Promise<any>;
  updateAsset: (id: string, data: any) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  disposeAsset: (id: string, disposedAt: string, reason?: string) => Promise<void>;
  reactivateAsset: (id: string) => Promise<void>;

  setCompetence: (comp: string) => void;
}

function currentCompetence(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}
function lastClosedCompetence(): string {
  const now = new Date();
  const firstOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastClosed = new Date(firstOfCurrent.getFullYear(), firstOfCurrent.getMonth() - 1, 1);
  return `${lastClosed.getFullYear()}-${String(lastClosed.getMonth()+1).padStart(2,'0')}`;
}

export const useDepreciationStore = create<DepreciationState>((set, get) => ({
  companies: [],
  selectedCompanyId: (() => {
    try { return localStorage.getItem('dep_selected_company') || null; } catch { return null; }
  })(),
  categories: [],
  assets: [],
  competence: lastClosedCompetence(),
  isLoading: false,

  fetchCompanies: async () => {
    const res = await apiFetch('/api/companies');
    if (res.ok) {
      const data = await res.json();
      set({ companies: data });
      const sel = get().selectedCompanyId;
      if (!sel && data.length > 0) {
        const first = data[0].id;
        set({ selectedCompanyId: first });
        try { localStorage.setItem('dep_selected_company', first); } catch {}
      } else if (sel && !data.find((c: any) => c.id === sel)) {
        if (data.length > 0) {
          set({ selectedCompanyId: data[0].id });
          try { localStorage.setItem('dep_selected_company', data[0].id); } catch {}
        } else {
          set({ selectedCompanyId: null });
          try { localStorage.removeItem('dep_selected_company'); } catch {}
        }
      }
    }
  },

  selectCompany: (id) => {
    set({ selectedCompanyId: id });
    try {
      if (id) localStorage.setItem('dep_selected_company', id);
      else localStorage.removeItem('dep_selected_company');
    } catch {}
  },

  createCompany: async (data) => {
    const res = await apiFetch('/api/companies', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error || 'Erro ao criar empresa');
    const created = await res.json();
    await get().fetchCompanies();
    set({ selectedCompanyId: created.id });
    try { localStorage.setItem('dep_selected_company', created.id); } catch {}
    return created;
  },

  updateCompany: async (id, data) => {
    const res = await apiFetch(`/api/companies/${id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erro ao atualizar');
    await get().fetchCompanies();
  },

  deleteCompany: async (id) => {
    const res = await apiFetch(`/api/companies/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir');
    await get().fetchCompanies();
  },

  fetchCategories: async () => {
    const comp = get().selectedCompanyId;
    const url = comp ? `/api/categories?companyId=${comp}` : '/api/categories';
    const res = await apiFetch(url);
    if (res.ok) set({ categories: await res.json() });
  },

  createCategory: async (data) => {
    const res = await apiFetch('/api/categories', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erro ao criar categoria');
    await get().fetchCategories();
  },

  deleteCategory: async (id) => {
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    await get().fetchCategories();
  },

  fetchAssets: async () => {
    const comp = get().selectedCompanyId;
    if (!comp) { set({ assets: [] }); return; }
    const res = await apiFetch(`/api/assets?companyId=${comp}`);
    if (res.ok) set({ assets: await res.json() });
  },

  createAsset: async (data) => {
    const res = await apiFetch('/api/assets', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error || 'Erro ao criar bem');
    const created = await res.json();
    await get().fetchAssets();
    return created;
  },

  updateAsset: async (id, data) => {
    const res = await apiFetch(`/api/assets/${id}`, { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Erro ao atualizar bem');
    await get().fetchAssets();
  },

  deleteAsset: async (id) => {
    await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
    await get().fetchAssets();
  },

  disposeAsset: async (id, disposedAt, reason) => {
    const res = await apiFetch(`/api/assets/${id}/dispose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disposedAt, reason }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Erro ao dar baixa');
    await get().fetchAssets();
  },

  reactivateAsset: async (id) => {
    const res = await apiFetch(`/api/assets/${id}/reactivate`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).error || 'Erro ao reativar');
    await get().fetchAssets();
  },

  setCompetence: (comp) => set({ competence: comp }),
}));

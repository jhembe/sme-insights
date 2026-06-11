import api from './client';

export interface RowError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ImportResult {
  imported: number;
  errors: RowError[];
}

export const importExportApi = {
  exportSales: (
    businessId: string,
    format: 'csv' | 'xlsx',
    startDate?: string,
    endDate?: string,
  ): Promise<Blob> =>
    api
      .get(`/businesses/${businessId}/export/sales`, {
        params: { format, startDate, endDate },
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),

  exportExpenses: (
    businessId: string,
    format: 'csv' | 'xlsx',
    startDate?: string,
    endDate?: string,
  ): Promise<Blob> =>
    api
      .get(`/businesses/${businessId}/export/expenses`, {
        params: { format, startDate, endDate },
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),

  downloadTemplate: (
    businessId: string,
    type: 'sales' | 'products',
  ): Promise<Blob> =>
    api
      .get(`/businesses/${businessId}/export/${type}/template`, {
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),

  importSales: (businessId: string, file: File): Promise<ImportResult> => {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post<ImportResult>(`/businesses/${businessId}/import/sales`, fd)
      .then((r) => r.data);
  },

  importProducts: (businessId: string, file: File): Promise<ImportResult> => {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post<ImportResult>(`/businesses/${businessId}/import/products`, fd)
      .then((r) => r.data);
  },
};

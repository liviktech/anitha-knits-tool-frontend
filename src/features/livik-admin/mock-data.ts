export interface Company {
  id: string;
  name: string;
  code: string;
  gstNumber: string;
  adminMobile: string;
  adminPasswordHash: string;
  address: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

/**
 * Static seed data for the Livik Admin panel — there's no company-management
 * API yet, so the Companies list and Company Details screens both read from
 * this single in-memory source.
 */
export const companies: Company[] = [
  {
    id: '1',
    name: 'Infinity Textiles',
    code: 'INTX-2024-001',
    gstNumber: '33AABCI2345C1Z5',
    adminMobile: '+91 98765 43210',
    adminPasswordHash: '8f3a1c9e4b2d7f60a51e3c8d2b904f77',
    address: 'No. 123, Textile Park,\nAvinashi Road,\nTirupur, Tamil Nadu - 641654,\nIndia',
    status: 'Active',
    createdAt: '15 May 2024, 10:30 AM',
    updatedAt: '28 May 2024, 04:45 PM',
  },
  {
    id: '2',
    name: 'Sunrise Textile Mills',
    code: 'SNT-2023-014',
    gstNumber: '27AACST5678D1Z2',
    adminMobile: '+91 90000 11122',
    adminPasswordHash: '4c1a9f2e8b7d3f50a61e2c9d1b805e88',
    address: 'Plot 45, Industrial Estate,\nMIDC Road,\nPune, Maharashtra - 411019,\nIndia',
    status: 'Active',
    createdAt: '02 Feb 2023, 09:15 AM',
    updatedAt: '18 Apr 2024, 02:10 PM',
  },
  {
    id: '3',
    name: 'Everest Fabrics Pvt Ltd',
    code: 'EVF-2024-009',
    gstNumber: '19AAECF4321E1Z9',
    adminMobile: '+91 88888 22233',
    adminPasswordHash: '9b2d7e4c1a8f3d60b71e4c0d2a915f66',
    address: '12/A, Sector V,\nSalt Lake,\nKolkata, West Bengal - 700091,\nIndia',
    status: 'Inactive',
    createdAt: '20 Sep 2024, 11:40 AM',
    updatedAt: '20 Sep 2024, 11:40 AM',
  },
  {
    id: '4',
    name: 'Coastal Knits & Co',
    code: 'CKC-2022-027',
    gstNumber: '33AACCK9988F1Z3',
    adminMobile: '+91 77777 33344',
    adminPasswordHash: '2e6a8c4f1b9d7e30a51f3c6d8b204a77',
    address: '7, Harbour Road,\nErnakulam,\nKochi, Kerala - 682001,\nIndia',
    status: 'Active',
    createdAt: '11 Nov 2022, 04:05 PM',
    updatedAt: '30 Jun 2024, 09:50 AM',
  },
];

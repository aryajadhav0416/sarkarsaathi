export interface FieldConfig {
  field: string;
  required: boolean;
  source: 'extractable' | 'manual_only';
  isApplicable?: (settings: Record<string, string>) => boolean;
  validate?: (value: string, settings: Record<string, string>) => string | null;
}

export interface SchemeConfig {
  id: string;
  name: string;
  supportedDocTypes: string[];
  docTypeMappings: Record<string, Record<string, string>>;
  postProcess?: (aggregatedValues: Record<string, string | null>, aggregatedConfidence: Record<string, any>) => void;
  fields: FieldConfig[];
}

export const udyamScheme: SchemeConfig = {
  id: 'udyam',
  name: 'Udyam Registration',
  supportedDocTypes: ['aadhaar', 'pan', 'gstCertificate', 'bankProof'],
  docTypeMappings: {
    aadhaar: {
      aadhaarNumber: 'aadhaarNumber',
      fullName: 'name'
    },
    pan: {
      panNumber: 'panNumber',
      fullName: 'name'
    },
    gstCertificate: {
      gstin: 'gstin',
      businessName: 'businessName',
      address: 'businessAddress'
    },
    bankProof: {
      bankAccountNumber: 'bankAccountNumber',
      ifscCode: 'ifscCode'
    }
  },
  postProcess: (aggregatedValues, aggregatedConfidence) => {
    // Heuristic to infer Business Type if not explicitly defined
    if (aggregatedValues.businessName && !aggregatedValues.businessType) {
      const nameUpper = aggregatedValues.businessName.toUpperCase();
      if (nameUpper.includes('PVT') || nameUpper.includes('PRIVATE LIMITED')) {
        aggregatedValues.businessType = 'Private Limited Company';
        aggregatedConfidence.businessType = 'high';
      } else if (nameUpper.includes('LLP') || nameUpper.includes('LIMITED LIABILITY PARTNERSHIP')) {
        aggregatedValues.businessType = 'Limited Liability Partnership (LLP)';
        aggregatedConfidence.businessType = 'high';
      } else if (nameUpper.includes('COOPERATIVE') || nameUpper.includes('CO-OPERATIVE')) {
        aggregatedValues.businessType = 'Co-operative Society';
        aggregatedConfidence.businessType = 'high';
      } else if (nameUpper.includes('PARTNERSHIP')) {
        aggregatedValues.businessType = 'Partnership Firm';
        aggregatedConfidence.businessType = 'low';
      }
    }
  },
  fields: [
    {
      field: 'aadhaarNumber',
      required: true,
      source: 'extractable',
      validate: (val) => {
        if (!val || !val.trim()) return 'This field is required.';
        const clean = val.replace(/\s/g, '');
        if (clean.length < 12) {
          return 'Aadhaar must be at least 12 characters.';
        }
        return null;
      }
    },
    {
      field: 'mobileNumber',
      required: true,
      source: 'manual_only',
      validate: (val) => {
        if (!val || !val.trim()) return 'This field is required.';
        const clean = val.replace(/\s/g, '');
        if (clean.length < 10) {
          return 'Mobile number must be at least 10 digits.';
        }
        return null;
      }
    },
    {
      field: 'panNumber',
      required: true,
      source: 'extractable',
      validate: (val) => {
        if (!val || !val.trim()) return 'This field is required.';
        if (val.trim().length < 10) {
          return 'PAN should be at least 10 characters.';
        }
        return null;
      }
    },
    {
      field: 'name',
      required: true,
      source: 'extractable',
      validate: (val) => {
        if (!val || !val.trim()) return 'Entrepreneur Name must not be empty.';
        return null;
      }
    },
    {
      field: 'panOfBusiness',
      required: true, // evaluated dynamically based on applicability
      source: 'extractable',
      isApplicable: (settings) => {
        const type = settings.businessType || '';
        return !(type.toLowerCase().includes('proprietorship') || type.toLowerCase().includes('individual') || type === 'Proprietorship');
      },
      validate: (val, settings) => {
        const type = settings.businessType || '';
        const isNa = type.toLowerCase().includes('proprietorship') || type.toLowerCase().includes('individual') || type === 'Proprietorship';
        if (isNa) return null;
        if (!val || !val.trim()) return 'This field is required.';
        if (val.trim().length < 10) {
          return 'PAN should be at least 10 characters.';
        }
        return null;
      }
    },
    {
      field: 'gstin',
      required: true, // evaluated dynamically based on applicability
      source: 'extractable',
      isApplicable: (settings) => {
        return settings.gstRegistered !== 'no';
      },
      validate: (val, settings) => {
        if (settings.gstRegistered === 'no') return null;
        if (!val || !val.trim()) return 'This field is required.';
        if (val.trim().length < 15) {
          return 'GSTIN must be at least 15 characters.';
        }
        return null;
      }
    },
    {
      field: 'businessName',
      required: true,
      source: 'extractable',
      validate: (val) => {
        if (!val || !val.trim()) return 'Business name must not be empty.';
        return null;
      }
    },
    {
      field: 'businessAddress',
      required: true,
      source: 'extractable',
      validate: (val) => {
        if (!val || !val.trim()) return 'This field is required.';
        return null;
      }
    },
    {
      field: 'bankAccountNumber',
      required: true,
      source: 'extractable',
      validate: (val) => {
        if (!val || !val.trim()) return 'This field is required.';
        return null;
      }
    },
    {
      field: 'ifscCode',
      required: true,
      source: 'extractable',
      validate: (val, settings) => {
        const bankAcc = (settings.bankAccountNumber || '').trim();
        if (!val && !bankAcc) return null;
        if (!val || !val.trim()) return 'This field is required.';
        if (val.trim().length < 11) {
          return 'IFSC should be at least 11 characters.';
        }
        return null;
      }
    },
    {
      field: 'nicCode',
      required: true,
      source: 'manual_only',
      validate: (val) => {
        if (!val || !val.trim()) return 'This field is required.';
        return null;
      }
    },
    {
      field: 'investment',
      required: true,
      source: 'manual_only',
      validate: (val) => {
        if (!val || !val.trim()) return 'This field is required.';
        return null;
      }
    },
    {
      field: 'turnover',
      required: true,
      source: 'manual_only',
      validate: (val) => {
        if (!val || !val.trim()) return 'This field is required.';
        return null;
      }
    }
  ]
};

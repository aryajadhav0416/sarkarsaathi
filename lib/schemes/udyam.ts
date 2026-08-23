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
        const cleanAadhaar = val.replace(/\s/g, '').toUpperCase();
        const aadhaarRegex = /^(\d{12}|X{8}\d{4})$/;
        if (!aadhaarRegex.test(cleanAadhaar)) {
          return 'Aadhaar must be exactly 12 digits (e.g., 123456789012) or in masked format (e.g., XXXX XXXX 1234).';
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
        if (!/^\d{10}$/.test(clean)) {
          return 'Mobile number must be exactly 10 digits.';
        }
        return null;
      }
    },
    {
      field: 'panNumber',
      required: false,
      source: 'extractable',
      validate: () => null
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
      required: false, // evaluated dynamically based on applicability
      source: 'extractable',
      isApplicable: (settings) => {
        const type = settings.businessType || '';
        return !(type.toLowerCase().includes('proprietorship') || type.toLowerCase().includes('individual') || type === 'Proprietorship');
      },
      validate: () => null
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
        const gstinRegex = /^[0-9OQDILZSB]{2}[A-Z]{5}[0-9OQDILZSB]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/i;
        if (!gstinRegex.test(val.trim())) {
          return 'GSTIN must match the 15-character format (2 digits state code + 10-character PAN + 1 entity code + 1 default "Z" + 1 checksum).';
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
        // Only validate if bank details were provided
        if (!val && !bankAcc) return null;
        if (!val || !val.trim()) return 'This field is required.';
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
        if (!ifscRegex.test(val.trim())) {
          return 'IFSC should be 11 characters: 4 letters, "0", and 6 alphanumeric characters (e.g., SBIN0001029).';
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

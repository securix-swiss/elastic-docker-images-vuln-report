export interface CVE {
  Description: string;
  Severity: 'LOW' | 'MEDIUM' | 'HIGH' | string; // Assuming there could be other severity levels as well
  CVSS: {
    nvd?: {
      V2Score?: number;
      V3Score?: number;
    };
    redhat?: {
      V2Score?: number;
      V3Score?: number;
    };
  };
  affected_versions: string[];
  not_affected_versions: string[];
}

export interface CVEData {
  [cveId: string]: CVE;
}

export interface Release {
  version: string;
  published_at: string;
}

export interface ProductData {
  name: string;
  date: string;
  dockerImage: string;
  cveData: CVEData;
  releases: Release[];
}
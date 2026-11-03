export interface User {
  id: number;
  email: string;
}

export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface LocationInput {
  name: string;
  latitude: number;
  longitude: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadResponse {
  fileName: string;
  count: number;
  locations: Location[];
}

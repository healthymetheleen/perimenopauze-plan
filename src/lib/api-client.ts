// API Client for Sevalla Backend
// This replaces the Supabase client

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Auth token management
let authToken: string | null = localStorage.getItem('auth_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('auth_token', token);
}

export function setRefreshToken(token: string) {
  refreshToken = token;
  localStorage.setItem('refresh_token', token);
}

export function clearAuth() {
  authToken = null;
  refreshToken = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
}

export function getAuthToken() {
  return authToken;
}

// Generic fetch wrapper with auth
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  const url = `${API_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Request failed');
  }

  return result;
}

// ============================================
// AUTH API
// ============================================

export const auth = {
  // Sign up
  signup: async (email: string, password: string, fullName?: string) => {
    const result = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (result.success && result.data) {
      setAuthToken(result.data.token);
      setRefreshToken(result.data.refreshToken);
    }

    return result;
  },

  // Login
  login: async (email: string, password: string) => {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.success && result.data) {
      setAuthToken(result.data.token);
      setRefreshToken(result.data.refreshToken);
    }

    return result;
  },

  // Get current user
  me: async () => {
    return apiFetch('/api/auth/me');
  },

  // Logout
  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAuth();
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!authToken;
  },
};

// ============================================
// DIARY API
// ============================================

export const diary = {
  // Get all diary entries
  getAll: async (params?: { limit?: number; offset?: number; start_date?: string; end_date?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiFetch(`/api/diary?${queryParams.toString()}`);
  },

  // Get single diary entry
  getById: async (id: string) => {
    return apiFetch(`/api/diary/${id}`);
  },

  // Create diary entry
  create: async (entry: {
    entry_date: string;
    content: string;
    mood?: number;
    energy_level?: number;
    symptoms?: string[];
  }) => {
    return apiFetch('/api/diary', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  // Update diary entry
  update: async (id: string, entry: Partial<{
    entry_date: string;
    content: string;
    mood?: number;
    energy_level?: number;
    symptoms?: string[];
  }>) => {
    return apiFetch(`/api/diary/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  },

  // Delete diary entry
  delete: async (id: string) => {
    return apiFetch(`/api/diary/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// CYCLE API
// ============================================

export const cycle = {
  // Get all cycles
  getAll: async (params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    return apiFetch(`/api/cycle?${queryParams.toString()}`);
  },

  // Get current/active cycle
  getCurrent: async () => {
    return apiFetch('/api/cycle/current');
  },

  // Get cycle predictions
  getPredictions: async () => {
    return apiFetch('/api/cycle/predictions');
  },

  // Create cycle
  create: async (cycle: {
    start_date: string;
    end_date?: string;
    flow_intensity?: number;
    notes?: string;
  }) => {
    return apiFetch('/api/cycle', {
      method: 'POST',
      body: JSON.stringify(cycle),
    });
  },

  // Update cycle
  update: async (id: string, cycle: Partial<{
    start_date: string;
    end_date?: string;
    flow_intensity?: number;
    notes?: string;
  }>) => {
    return apiFetch(`/api/cycle/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cycle),
    });
  },

  // Delete cycle
  delete: async (id: string) => {
    return apiFetch(`/api/cycle/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// PROFILE API
// ============================================

export const profile = {
  // Get user profile
  get: async () => {
    return apiFetch('/api/profile');
  },

  // Update profile
  update: async (data: {
    date_of_birth?: string;
    height?: number;
    weight?: number;
    language?: 'nl' | 'en';
    notifications_enabled?: boolean;
  }) => {
    return apiFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// RECIPES API
// ============================================

export const recipes = {
  // Get all recipes
  getAll: async (params?: { limit?: number; offset?: number; search?: string; tags?: string[] }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.tags) params.tags.forEach(tag => queryParams.append('tags', tag));

    return apiFetch(`/api/recipes?${queryParams.toString()}`);
  },

  // Get single recipe
  getById: async (id: string) => {
    return apiFetch(`/api/recipes/${id}`);
  },

  // Create recipe
  create: async (recipe: {
    title: string;
    description?: string;
    ingredients: string[];
    instructions: string[];
    prep_time?: number;
    cook_time?: number;
    servings?: number;
    calories_per_serving?: number;
    proteins_per_serving?: number;
    carbs_per_serving?: number;
    fats_per_serving?: number;
    image_url?: string;
    tags?: string[];
    is_public?: boolean;
  }) => {
    return apiFetch('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  },

  // Update recipe
  update: async (id: string, recipe: Partial<{
    title: string;
    description?: string;
    ingredients: string[];
    instructions: string[];
    prep_time?: number;
    cook_time?: number;
    servings?: number;
    calories_per_serving?: number;
    proteins_per_serving?: number;
    carbs_per_serving?: number;
    fats_per_serving?: number;
    image_url?: string;
    tags?: string[];
    is_public?: boolean;
  }>) => {
    return apiFetch(`/api/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipe),
    });
  },

  // Delete recipe
  delete: async (id: string) => {
    return apiFetch(`/api/recipes/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// ADMIN API
// ============================================

export const admin = {
  // Get dashboard stats
  getStats: async () => {
    return apiFetch('/api/admin/stats');
  },

  // List all users
  getUsers: async (page = 1, limit = 50, search = '') => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
    });
    return apiFetch(`/api/admin/users?${params}`);
  },

  // Get user details
  getUser: async (userId: string) => {
    return apiFetch(`/api/admin/users/${userId}`);
  },

  // Update user
  updateUser: async (userId: string, data: { is_admin?: boolean; is_premium?: boolean; email_verified?: boolean }) => {
    return apiFetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete user
  deleteUser: async (userId: string) => {
    return apiFetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Get all recipes
  getRecipes: async () => {
    return apiFetch('/api/admin/recipes');
  },

  // Delete recipe
  deleteRecipe: async (recipeId: string) => {
    return apiFetch(`/api/admin/recipes/${recipeId}`, {
      method: 'DELETE',
    });
  },

  // Get admin logs
  getLogs: async (page = 1, limit = 50) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiFetch(`/api/admin/logs?${params}`);
  },
};

// Export single API client
export const api = {
  auth,
  diary,
  cycle,
  profile,
  recipes,
  admin,
};

export default api;

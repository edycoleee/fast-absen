# Prompt AI - React Frontend Application (Vite, SWC, Tailwind CSS)

Gunakan prompt ini untuk membuat aplikasi frontend React dengan clean architecture, best practices, dan developer experience yang optimal.

---

## 🤖 PROMPT UNTUK AI

```
Buatkan React.js frontend application dengan arsitektur hybrid (clean 4-layer + by-feature di presentation layer) yang modern, scalable, dan production-ready.

## Requirements:

### 1. Tech Stack
- React 18.3.1
- Vite 6.0+ (Build tool + dev server)
- @vitejs/plugin-react-swc 3.7.2 (Super fast hot reload dengan SWC compiler)
- React Router DOM 6.22.0 (Client-side routing SPA)
- Axios 1.6.7 (HTTP client dengan interceptors)
- Tailwind CSS 3.4.1 (Utility-first CSS framework)
- JavaScript (bukan TypeScript) dengan JSDoc untuk type hints
- PostCSS 8.4.35
- Autoprefixer 10.4.17
- Node 18+

### 2. Hybrid Architecture (Recommended)

Gunakan strategi hybrid:
- `Core`, `Data`, `Domain` disusun per layer untuk reusability.
- `Presentation` disusun by-feature agar mudah dikembangkan per modul.

Implementasikan strict separation of concerns:

```
Frontend User
     ↓
[Presentation Layer] - UI/Components (React components, pages, layouts)
     ↓
[Domain Layer] - Business Logic (Contexts, Custom Hooks, State)
     ↓
[Data Layer] - External Data Sources (API, Storage)
     ↓
[Core Layer] - Entities & Constants (Shared business objects)
```

Layer responsibilities:
- **Presentation**: React components, pages, layouts, UI logic
- **Domain**: Custom hooks, contexts, state management, business logic
- **Data**: API client, repositories, local storage
- **Core**: Entities, constants, configuration

Hybrid rule:
- Logic reusable harus berada di `core/data/domain`.
- UI spesifik fitur harus berada di `presentation/features/[feature-name]`.
- Page tidak boleh memanggil `axios` langsung; akses data lewat repository/hook.

### 3. Project Structure (Hybrid-First)

```
project-name/
├── index.html                       # Entry point HTML
├── vite.config.js                   # Vite configuration dengan SWC
├── postcss.config.js                # PostCSS config (tailwind)
├── tailwind.config.js               # Tailwind CSS config
├── .eslintrc.json                   # ESLint configuration
├── package.json
├── package-lock.json
├── .env.example                     # Environment variables template
├── .gitignore
├── public/                          # Static assets
├── src/
│   ├── index.css                    # Global styles + Tailwind imports
│   ├── App.jsx                      # Root component + routing
│   ├── main.jsx                     # React DOM render entry
│   │
│   ├── core/                        # LAYER 1: Core/Domain
│   │   ├── constants/
│   │   │   ├── config.js            # API_BASE_URL, STORAGE_KEYS, TIMEOUT, dll
│   │   │   ├── routes.js            # Route path constants (/dashboard, /users, dll)
│   │   │   ├── errors.js            # Error codes & messages
│   │   │   └── index.js
│   │   ├── entities/                # Plain object factories
│   │   │   ├── User.js              # User(id, username, email, roles)
│   │   │   ├── Role.js              # Role(id, name, permissions)
│   │   │   ├── Permission.js        # Permission(code, name)
│   │   │   ├── [Entity].js          # Domain-specific entities
│   │   │   └── index.js
│   │   └── index.js
│   │
│   ├── data/                        # LAYER 2: Data
│   │   ├── api/
│   │   │   ├── client.js            # Axios instance + middleware/interceptors
│   │   │   │                        # - Auto JWT attachment
│   │   │   │                        # - Token refresh on 401
│   │   │   │                        # - Request/response logging
│   │   │   │                        # - Error handling
│   │   │   └── index.js
│   │   ├── repositories/            # Data access layer (wraps API)
│   │   │   ├── BaseRepository.js    # Abstract base dengan CRUD generik
│   │   │   ├── AuthRepository.js    # login, logout, refreshToken
│   │   │   ├── UserRepository.js    # CRUD + custom queries
│   │   │   ├── RoleRepository.js
│   │   │   ├── PermissionRepository.js
│   │   │   ├── [Entity]Repository.js
│   │   │   └── index.js
│   │   ├── storage/
│   │   │   ├── LocalStorage.js      # Wrapper aman untuk localStorage
│   │   │   │                        # - getToken(), setToken()
│   │   │   │                        # - getRefreshToken(), setRefreshToken()
│   │   │   │                        # - clearAuth()
│   │   │   └── index.js
│   │   └── index.js
│   │
│   ├── domain/                      # LAYER 3: Domain (Business Logic)
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx      # Authentication state + login/logout
│   │   │   │                        # - currentUser state
│   │   │   │                        # - isAuthenticated boolean
│   │   │   │                        # - login(username, password)
│   │   │   │                        # - logout()
│   │   │   │                        # - refreshAccessToken()
│   │   │   └── index.js
│   │   ├── hooks/                   # Custom React hooks per resource
│   │   │   ├── useAuth.js           # Access AuthContext
│   │   │   ├── useUsers.js          # CRUD hook untuk users
│   │   │   │                        # - users state
│   │   │   │                        # - loading, error states
│   │   │   │                        # - getUsers(), createUser(), updateUser(), deleteUser()
│   │   │   ├── useRoles.js
│   │   │   ├── usePermissions.js
│   │   │   ├── use[Entity].js
│   │   │   ├── useFetch.js          # Generic data fetching hook
│   │   │   ├── usePagination.js     # Pagination state management
│   │   │   ├── useForm.js           # Form state + validation
│   │   │   ├── useNotification.js   # Toast/alert state
│   │   │   └── index.js
│   │   └── index.js
│   │
│   └── presentation/                # LAYER 4: Presentation (UI/UX)
│       ├── components/
│       │   ├── common/              # Reusable UI components
│       │   │   ├── Button.jsx       # <Button variant="primary" size="lg" />
│       │   │   ├── Input.jsx        # <Input type="text" ... />
│       │   │   ├── Modal.jsx        # <Modal isOpen={...} />
│       │   │   ├── Table.jsx        # <Table columns={...} data={...} />
│       │   │   ├── Pagination.jsx   # <Pagination current={...} total={...} />
│       │   │   ├── Loading.jsx      # <Loading />
│       │   │   ├── Error.jsx        # <Error message={...} />
│       │   │   ├── Card.jsx         # <Card>...</Card>
│       │   │   ├── Badge.jsx        # <Badge variant="success">Active</Badge>
│       │   │   ├── Dropdown.jsx     # <Dropdown items={...} />
│       │   │   ├── Toast.jsx        # Toast notification container
│       │   │   ├── ConfirmDialog.jsx # Confirmation modal
│       │   │   ├── PrivateRoute.jsx # Protected route wrapper
│       │   │   └── index.js
│       │   ├── layout/              # Layout components
│       │   │   ├── AdminLayout.jsx  # Layout dengan header + sidebar + footer
│       │   │   ├── Header.jsx       # Navigation header
│       │   │   ├── Sidebar.jsx      # Navigation sidebar
│       │   │   ├── Footer.jsx
│       │   │   └── index.js
│       │   └── features/            # Feature-specific components
│       │       ├── auth/
│       │       │   ├── LoginForm.jsx
│       │       │   └── RegisterForm.jsx
│       │       ├── users/
│       │       │   ├── UserList.jsx
│       │       │   ├── UserForm.jsx
│       │       │   └── UserModal.jsx
│       │       ├── [feature]/
│       │       │   └── [Component].jsx
│       │       └── index.js
│       ├── pages/                   # Page components (route components)
│       │   ├── index.js             # Export semua pages
│       │   ├── LandingPage.jsx      # Landing / home page
│       │   ├── auth/
│       │   │   ├── LoginPage.jsx
│       │   │   ├── RegisterPage.jsx
│       │   │   └── ForgotPasswordPage.jsx
│       │   ├── dashboard/
│       │   │   ├── DashboardPage.jsx
│       │   │   └── StatisticsPage.jsx
│       │   ├── users/
│       │   │   ├── UsersPage.jsx    # List + search + filter
│       │   │   ├── UserDetailPage.jsx
│       │   │   └── UserEditPage.jsx
│       │   ├── roles/
│       │   │   ├── RolesPage.jsx
│       │   │   └── RoleDetailPage.jsx
│       │   ├── [resource]/
│       │   │   ├── [Resource]Page.jsx
│       │   │   └── [Resource]DetailPage.jsx
│       │   └── NotFoundPage.jsx
│       ├── hooks/
│       │   ├── useQueryParams.js    # Parse URL query params
│       │   ├── useDebounce.js       # Debounce search input
│       │   └── index.js
│       └── utils/
│           ├── format.js            # formatDate(), formatCurrency(), dll
│           ├── validation.js        # validateEmail(), validatePassword(), dll
│           ├── helpers.js           # Utility functions
│           └── index.js
├── tests/
│   ├── components/
│   ├── hooks/
│   ├── __mocks__/
│   └── setup.js
└── styles/
    ├── colors.css               # Custom color variables
    ├── spacing.css              # Spacing utilities
    └── animations.css           # Animation definitions
```

### 4. Vite Configuration (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    cors: true,
    proxy: {
      // Optional: Proxy API calls during development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/api/, '/api/v1')
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false, // Set to true untuk debugging
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['axios']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

### 5. Axios API Client (data/api/client.js)

```javascript
import axios from 'axios'
import { CONFIG } from '@/core/constants'
import { LocalStorage } from '@/data/storage'

const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = LocalStorage.getAccessToken()
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle 401 & token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Token expired - try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = LocalStorage.getRefreshToken()
        const response = await axios.post(\`\${CONFIG.API_BASE_URL}/auth/refresh\`, {
          refresh_token: refreshToken
        })

        const { data } = response
        LocalStorage.setAccessToken(data.data.access_token)
        LocalStorage.setRefreshToken(data.data.refresh_token)

        // Retry original request dengan token baru
        originalRequest.headers.Authorization = \`Bearer \${data.data.access_token}\`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed - logout user
        LocalStorage.clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
```

### 6. Base Repository (data/repositories/BaseRepository.js)

```javascript
import apiClient from '@/data/api/client'

/**
 * Abstract base repository dengan CRUD operations
 * @template T
 */
export class BaseRepository {
  /**
   * @param {string} endpoint - Endpoint path (e.g., '/users')
   */
  constructor(endpoint) {
    this.endpoint = endpoint
  }

  /**
   * Get semua items dengan pagination
   * @param {number} skip
   * @param {number} limit
   * @returns {Promise<{items: T[], total: number}>}
   */
  async getAll(skip = 0, limit = 100) {
    const { data } = await apiClient.get(this.endpoint, {
      params: { skip, limit }
    })
    return data.data
  }

  /**
   * Get item by ID
   * @param {number} id
   * @returns {Promise<T>}
   */
  async getById(id) {
    const { data } = await apiClient.get(\`\${this.endpoint}/\${id}\`)
    return data.data
  }

  /**
   * Create new item
   * @param {object} payload
   * @returns {Promise<T>}
   */
  async create(payload) {
    const { data } = await apiClient.post(this.endpoint, payload)
    return data.data
  }

  /**
   * Update item
   * @param {number} id
   * @param {object} payload
   * @returns {Promise<T>}
   */
  async update(id, payload) {
    const { data } = await apiClient.put(\`\${this.endpoint}/\${id}\`, payload)
    return data.data
  }

  /**
   * Delete item
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const { data } = await apiClient.delete(\`\${this.endpoint}/\${id}\`)
    return data.success
  }

  /**
   * Search items
   * @param {string} query
   * @param {number} skip
   * @param {number} limit
   * @returns {Promise<{items: T[], total: number}>}
   */
  async search(query, skip = 0, limit = 100) {
    const { data } = await apiClient.get(this.endpoint, {
      params: { q: query, skip, limit }
    })
    return data.data
  }
}
```

### 7. Auth Repository (data/repositories/AuthRepository.js)

```javascript
import apiClient from '@/data/api/client'
import { LocalStorage } from '@/data/storage'

export class AuthRepository {
  /**
   * Login user
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{user: object, access_token: string, refresh_token: string}>}
   */
  static async login(username, password) {
    const { data } = await apiClient.post('/auth/login', {
      username,
      password
    })
    return data.data
  }

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Promise<{access_token: string, refresh_token: string}>}
   */
  static async refreshToken(refreshToken) {
    const { data } = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken
    })
    return data.data
  }

  /**
   * Logout user (revoke all refresh tokens)
   * @returns {Promise<boolean>}
   */
  static async logout() {
    try {
      const { data } = await apiClient.post('/auth/logout')
      LocalStorage.clearAuth()
      return data.success
    } catch (error) {
      // Clear auth even if API call fails
      LocalStorage.clearAuth()
      return true
    }
  }

  /**
   * Get current user profile
   * @returns {Promise<object>}
   */
  static async getCurrentUser() {
    const { data } = await apiClient.get('/auth/me')
    return data.data
  }
}
```

### 8. Local Storage Wrapper (data/storage/LocalStorage.js)

```javascript
import { CONFIG } from '@/core/constants'

/**
 * Safe wrapper untuk localStorage
 */
export class LocalStorage {
  static getAccessToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN) || null
  }

  static setAccessToken(token) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, token)
  }

  static getRefreshToken() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN) || null
  }

  static setRefreshToken(token) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, token)
  }

  static setAuthTokens(accessToken, refreshToken) {
    this.setAccessToken(accessToken)
    this.setRefreshToken(refreshToken)
  }

  static clearAuth() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN)
  }

  static getUser() {
    const user = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_USER)
    return user ? JSON.parse(user) : null
  }

  static setUser(user) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
  }

  static clearUser() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER)
  }

  static clear() {
    this.clearAuth()
    this.clearUser()
  }
}
```

### 9. Auth Context (domain/contexts/AuthContext.jsx)

```jsx
import { createContext, useState, useEffect } from 'react'
import { AuthRepository } from '@/data/repositories'
import { LocalStorage } from '@/data/storage'

export const AuthContext = createContext(null)

/**
 * Authentication Context Provider
 * Provides: user, isAuthenticated, isLoading, login, logout, refreshAccessToken
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = LocalStorage.getAccessToken()
      const refreshToken = LocalStorage.getRefreshToken()

      if (accessToken && refreshToken) {
        try {
          const currentUser = await AuthRepository.getCurrentUser()
          setUser(currentUser)
        } catch (err) {
          // Try refresh token
          try {
            const tokens = await AuthRepository.refreshToken(refreshToken)
            LocalStorage.setAuthTokens(tokens.access_token, tokens.refresh_token)
            const currentUser = await AuthRepository.getCurrentUser()
            setUser(currentUser)
          } catch (refreshErr) {
            LocalStorage.clearAuth()
            setUser(null)
          }
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (username, password) => {
    try {
      setIsLoading(true)
      setError(null)

      const { user, access_token, refresh_token } = await AuthRepository.login(
        username,
        password
      )

      LocalStorage.setAuthTokens(access_token, refresh_token)
      LocalStorage.setUser(user)
      setUser(user)

      return user
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await AuthRepository.logout()
    } finally {
      LocalStorage.clear()
      setUser(null)
    }
  }

  const refreshAccessToken = async () => {
    try {
      const refreshToken = LocalStorage.getRefreshToken()
      if (!refreshToken) throw new Error('No refresh token')

      const tokens = await AuthRepository.refreshToken(refreshToken)
      LocalStorage.setAuthTokens(tokens.access_token, tokens.refresh_token)
    } catch (err) {
      await logout()
      throw err
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    refreshAccessToken
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

### 10. useAuth Hook (domain/hooks/useAuth.js)

```javascript
import { useContext } from 'react'
import { AuthContext } from '@/domain/contexts'

/**
 * Custom hook untuk akses authentication state
 * @returns {{
 *   user: object,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   login: Function,
 *   logout: Function
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### 11. useFetch Hook (domain/hooks/useFetch.js)

```javascript
import { useState, useEffect } from 'react'

/**
 * Generic data fetching hook
 * @param {Function} fetchFn - Async function yang return data
 * @param {boolean} immediate - Execute immediately on mount
 * @returns {{data: any, loading: boolean, error: Error, retry: Function}}
 */
export function useFetch(fetchFn, immediate = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      setData(result)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [])

  return { data, loading, error, retry: execute }
}
```

### 12. useForm Hook (domain/hooks/useForm.js)

```javascript
import { useState, useCallback } from 'react'

/**
 * Form state management hook
 * @param {object} initialValues
 * @param {Function} onSubmit
 * @returns {{
 *   values: object,
 *   errors: object,
 *   touched: object,
 *   isSubmitting: boolean,
 *   changed: object,
 *   setFieldValue: Function,
 *   setFieldTouched: Function,
 *   handleChange: Function,
 *   handleBlur: Function,
 *   handleSubmit: Function,
 *   reset: Function
 * }}
 */
export function useForm(initialValues, onSubmit) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [changed, setChanged] = useState({})

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setChanged((prev) => ({ ...prev, [name]: true }))
  }, [])

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }))
  }, [])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFieldValue(name, value)
  }, [setFieldValue])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setFieldTouched(name)
  }, [setFieldTouched])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      await onSubmit(values)
    } catch (error) {
      if (error.response?.data?.data?.errors) {
        setErrors(error.response.data.data.errors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setChanged({})
  }, [initialValues])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    changed,
    setFieldValue,
    setFieldTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset
  }
}
```

### 13. PrivateRoute Component (presentation/components/common/PrivateRoute.jsx)

```jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/domain/hooks'
import { ROUTES } from '@/core/constants'

/**
 * Protected route component
 * Redirect ke login jika tidak authenticated
 */
export function PrivateRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <Outlet />
}
```

### 14. App.jsx - Main Routing

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/domain/contexts'
import { PrivateRoute } from '@/presentation/components/common'
import {
  LandingPage,
  LoginPage,
  DashboardPage,
  UsersPage,
  RolesPage,
  NotFoundPage
} from '@/presentation/pages'
import { AdminLayout } from '@/presentation/components/layout'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/roles" element={<RolesPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
```

### 15. Constants (core/constants/config.js)

```javascript
export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  TIMEOUT: 30000,
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    CURRENT_USER: 'current_user'
  }
}
```

### 16. Routes Constants (core/constants/routes.js)

```javascript
export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  // Admin
  DASHBOARD: '/dashboard',
  USERS: '/users',
  USERS_DETAIL: '/users/:id',
  USERS_EDIT: '/users/:id/edit',
  ROLES: '/roles',
  PERMISSIONS: '/permissions',
  SETTINGS: '/settings'
}
```

### 17. Reusable Components Examples

#### Button Component
```jsx
/**
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'success'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} isLoading
 * @param {boolean} disabled
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  children,
  ...props
}) {
  const baseStyles = 'font-semibold rounded transition-colors'
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button
      className={`\${baseStyles} \${variants[variant]} \${sizes[size]}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span>Loading...</span> : children}
    </button>
  )
}
```

#### Table Component
```jsx
/**
 * @param {Array} columns - [{key: 'id', label: 'ID', render: (value) => ...}]
 * @param {Array} data - Table rows
 * @param {boolean} loading
 */
export function Table({ columns, data, loading = false }) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <table className="w-full border-collapse border border-gray-300">
      <thead className="bg-gray-100">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="border border-gray-300 px-4 py-2 text-left">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            {columns.map((col) => (
              <td key={col.key} className="border border-gray-300 px-4 py-2">
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### 18. Tailwind CSS Configuration

```javascript
// tailwind.config.js
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        danger: '#EF4444'
      },
      spacing: {
        128: '32rem'
      }
    }
  },
  plugins: []
}
```

### 19. Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .js,.jsx",
    "lint:fix": "eslint src --ext .js,.jsx --fix"
  }
}
```

### 20. .env.example

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_ENVIRONMENT=development
```

---

## ✅ Implementation Checklist

- [ ] Setup Vite + React + SWC + Tailwind
- [ ] Create hybrid-first structure: layered core/data/domain + by-feature presentation
- [ ] Implement Axios client dengan interceptors
- [ ] Create base repository class
- [ ] Create AuthContext + AuthProvider
- [ ] Create useAuth hook
- [ ] Implement PrivateRoute component
- [ ] Create login page + form
- [ ] Create reusable common components (Button, Input, Table, Modal)
- [ ] Create admin layout (header, sidebar, footer)
- [ ] Create dashboard page
- [ ] Create CRUD pages (users, roles, etc)
- [ ] Setup ESLint + Tailwind CSS
- [ ] Write JSDoc comments
- [ ] Test authentication flow
- [ ] Build for production

---

## 🚀 Quick Start

```bash
# 1. Create project
npm create vite@latest my-app -- --template react

# 2. Install dependencies
cd my-app
npm install
npm install -D @vitejs/plugin-react-swc tailwindcss postcss autoprefixer eslint

# 3. Setup Tailwind
npx tailwindcss init -p

# 4. Create directory structure
mkdir -p src/{core,data,domain,presentation}/{contexts,hooks,components,repositories,pages}

# 5. Configure .env
cp .env.example .env
# Edit dengan API_BASE_URL

# 6. Run development server
npm run dev

# 7. Access
# http://localhost:5173
```

---

## 📚 Best Practices Summary

1. **Hybrid Architecture** - Layered core/data/domain + by-feature presentation
2. **Axios Interceptors** - Auto JWT attach + token refresh
3. **Context API** - Simple state management untuk auth
4. **Custom Hooks** - Reusable logic
5. **Repository Pattern** - Abstraction data layer
6. **Component Composition** - Small, focused components
7. **JSDoc** - Dokumentasi code
8. **Tailwind CSS** - Utility-first styling
9. **Error Handling** - Graceful error messages
10. **Performance** - Code splitting, lazy loading

---

## 🔗 Directory Structure Benefits

| Layer | Responsibility | Example |
|-------|-----------------|---------|
| **Core** | Entities & Constants | User, Role, ROUTES |
| **Data** | API + Storage | UserRepository, LocalStorage |
| **Domain** | Business Logic | useUsers hook, AuthContext |
| **Presentation** | UI Components | LoginPage, Button, Table |

---

## 🔐 Security Best Practices

1. **Never store sensitive data** in localStorage (hanya tokens)
2. **Use HTTPS** in production
3. **Validate input** di form level
4. **Refresh tokens** otomatis sebelum expired
5. **Clear auth** on logout
6. **CORS** properly configured
7. **CSP headers** untuk prevent XSS
8. **Sanitize output** dari API

---

## 📊 SWC Benefits

✅ Lightning-fast compilation (10-20x faster than Babel)
✅ Perfect hot module replacement (HMR)
✅ TypeScript/JSX parsing built-in
✅ Minimal configuration required
✅ Ideal untuk development dengan rapid iteration

---

## 🎯 Tech Stack Rationale

- **React 18** - Latest stable version dengan concurrent rendering
- **Vite** - Modern bundler dengan incredible DX
- **SWC** - Blazingly fast compiler written in Rust
- **React Router v6** - Best-in-class routing
- **Axios** - Mature HTTP client dengan interceptors
- **Tailwind CSS** - Utility-first, production-ready styling
- **JavaScript (JSDoc)** - Flexibility tanpa TypeScript overhead
```

---

## 📚 Additional Resources

- [React Docs](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router v6](https://reactrouter.com/)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [Tailwind CSS](https://tailwindcss.com/)
- [Clean Architecture Frontend](https://www.freecodecamp.org/news/clean-architecture-in-frontend-web-development-2d)

---

## 🏗️ Scaling the Architecture

**For small projects:** Start with hybrid lite (minimal core/data/domain, by-feature presentation)

**For medium projects:** Full hybrid (shared repositories/hooks + feature-based UI modules)

**For large projects:** Hybrid + stronger boundaries (feature modules in presentation, strict import rules, shared domain services)

Hybrid architecture scales smoothly without major refactoring and minimizes duplicated logic across features.

# Frontend Clean Architecture

Frontend aplikasi ini dibangun dengan **Clean Architecture** untuk memudahkan maintainability dan scalability.

## 📁 Struktur Folder

```
src/
├── core/                      # Domain Layer - Business Entities & Constants
│   ├── entities/             # Business entities (User, Pegawai, Role, etc.)
│   │   ├── User.js
│   │   ├── Pegawai.js
│   │   ├── Role.js
│   │   ├── Permission.js
│   │   └── Absensi.js
│   └── constants/            # Application constants
│       ├── routes.js         # Route definitions
│       └── config.js         # App configuration
│
├── data/                     # Data Layer - External Data Sources
│   ├── api/                  # API client configuration
│   │   └── client.js         # Axios instance with interceptors
│   ├── repositories/         # Data access repositories
│   │   ├── AuthRepository.js
│   │   ├── UserRepository.js
│   │   ├── PegawaiRepository.js
│   │   ├── RoleRepository.js
│   │   ├── PermissionRepository.js
│   │   └── AbsensiRepository.js
│   └── storage/              # Local storage management
│       └── LocalStorage.js
│
├── domain/                   # Business Logic Layer
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useUsers.js
│   │   ├── usePegawai.js
│   │   └── useRoles.js
│   └── contexts/             # React contexts
│       └── AuthContext.jsx   # Authentication context
│
├── presentation/             # Presentation Layer - UI Components
│   ├── components/
│   │   ├── common/          # Reusable components
│   │   │   └── PrivateRoute.jsx
│   │   ├── layout/          # Layout components
│   │   │   └── Layout.jsx
│   │   └── features/        # Feature-specific components
│   └── pages/               # Page components
│       ├── Login.jsx
│       ├── Dashboard.jsx
│       ├── Users.jsx
│       ├── Pegawai.jsx
│       ├── Roles.jsx
│       ├── Permissions.jsx
│       ├── Absensi.jsx
│       └── LoginAbsensi.jsx
│
├── App.jsx                   # Root component
└── main.jsx                  # Application entry point
```

## 🏗️ Architecture Layers

### 1. **Core Layer** (`core/`)
- **Entities**: Domain models dengan business logic
- **Constants**: Route definitions, configurations, enums

**Prinsip**: 
- Tidak bergantung pada layer lain
- Pure JavaScript/business logic
- Reusable across the app

### 2. **Data Layer** (`data/`)
- **API Client**: Axios configuration dengan interceptors
- **Repositories**: Data access patterns untuk setiap entity
- **Storage**: LocalStorage management

**Prinsip**:
- Abstraksi untuk external data sources
- Single responsibility per repository
- Error handling di level repository

### 3. **Domain Layer** (`domain/`)
- **Hooks**: Custom React hooks untuk business logic
- **Contexts**: Global state management

**Prinsip**:
- Business logic terpisah dari UI
- Reusable hooks
- State management yang clean

### 4. **Presentation Layer** (`presentation/`)
- **Components**: UI components
- **Pages**: Page-level components

**Prinsip**:
- Purely presentational
- Menggunakan hooks dari domain layer
- Minimal business logic

## 🔄 Data Flow

```
User Interaction (UI)
    ↓
Presentation Layer (Pages/Components)
    ↓
Domain Layer (Hooks)
    ↓
Data Layer (Repositories)
    ↓
API/Storage
```

## 📦 Dependency Rules

1. **Core** → Tidak bergantung pada layer lain
2. **Data** → Hanya import dari **Core**
3. **Domain** → Import dari **Core** dan **Data**
4. **Presentation** → Import dari **Core** dan **Domain**

## 🎯 Benefits

1. **Separation of Concerns**: Setiap layer punya tanggung jawab yang jelas
2. **Testability**: Mudah di-test karena modular
3. **Maintainability**: Mudah di-maintain dan di-extend
4. **Reusability**: Components dan hooks bisa dipakai ulang
5. **Scalability**: Mudah ditambahkan fitur baru

## 🚀 Usage Example

```jsx
// In a Page component
import { useAuth, usePegawai } from '../../domain/hooks';

function PegawaiPage() {
  const { user } = useAuth();
  const { pegawai, loading, fetchPegawai } = usePegawai();
  
  useEffect(() => {
    fetchPegawai();
  }, []);
  
  return (
    // UI rendering
  );
}
```

## 📚 Further Reading

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [React Clean Architecture](https://dev.to/rubemfsv/clean-architecture-applying-with-react-40h6)

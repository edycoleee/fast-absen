# Clean Architecture - Frontend Structure

## 📁 Folder Structure

\`\`\`
frontend/src/
├── 🎯 core/                   # Core Layer - Business Entities & Constants
│   ├── entities/              # Domain entities with business logic
│   │   ├── User.js           # User entity
│   │   ├── Pegawai.js        # Pegawai (Employee) entity
│   │   ├── Role.js           # Role entity
│   │   ├── Permission.js     # Permission entity
│   │   └── Absensi.js        # Absensi (Attendance) entity
│   └── constants/            # Application constants
│       ├── routes.js         # Route definitions
│       └── config.js         # Configuration constants
│
├── 📦 data/                   # Data Layer - External Data Sources
│   ├── api/                  # API client
│   │   └── client.js         # Axios instance with interceptors
│   ├── repositories/         # Data access layer
│   │   ├── AuthRepository.js
│   │   ├── UserRepository.js
│   │   ├── PegawaiRepository.js
│   │   ├── RoleRepository.js
│   │   ├── PermissionRepository.js
│   │   └── AbsensiRepository.js
│   └── storage/              # Local storage
│       └── LocalStorage.js   # LocalStorage wrapper
│
├── 🔧 domain/                 # Domain Layer - Business Logic
│   ├── contexts/             # React contexts
│   │   └── AuthContext.jsx   # Authentication context
│   └── hooks/                # Custom React hooks
│       ├── useAuth.js        # Auth hook
│       ├── useUsers.js       # Users management hook
│       ├── usePegawai.js     # Pegawai management hook
│       ├── useRoles.js       # Roles management hook
│       └── useAbsensi.js     # Absensi management hook
│
└── 🎨 presentation/           # Presentation Layer - UI
    ├── components/
    │   ├── common/           # Reusable components
    │   │   └── PrivateRoute.jsx
    │   ├── layout/           # Layout components
    │   │   └── Layout.jsx
    │   └── features/         # Feature-specific components
    └── pages/                # Page components
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Users.jsx
        ├── Pegawai.jsx
        ├── Roles.jsx
        ├── Permissions.jsx
        ├── Absensi.jsx
        └── LoginAbsensi.jsx
\`\`\`

## 🔄 Data Flow

\`\`\`
User Action (Click, Submit)
         ↓
  📱 Presentation Layer
    (Pages/Components)
         ↓
   🔧 Domain Layer
      (Hooks)
         ↓
   📦 Data Layer
   (Repositories)
         ↓
     🌐 API
\`\`\`

## 📝 Usage Examples

### Using Hooks in Pages
\`\`\`jsx
import { useAuth, useUsers } from '../../domain/hooks';

function UsersPage() {
  const { user, isAdmin } = useAuth();
  const { users, loading, fetchUsers, deleteUser } = useUsers();
  
  useEffect(() => {
    fetchUsers(1, 10);
  }, [fetchUsers]);
  
  return (
    <div>
      {loading ? <Loader /> : <UserTable users={users} />}
    </div>
  );
}
\`\`\`

### Using Entities
\`\`\`jsx
import { User } from '../../core/entities';

const userData = new User(apiResponse.data);
console.log(userData.isAdmin());        // true/false
console.log(userData.getPrimaryRole()); // 'admin'
\`\`\`

### Using Repositories Directly
\`\`\`jsx
import UserRepository from '../../data/repositories/UserRepository';

const response = await UserRepository.getAll(1, 10);
\`\`\`

## 🎯 Layer Dependencies

\`\`\`
Core ← (No dependencies)
  ↑
Data
  ↑
Domain
  ↑
Presentation
\`\`\`

**Rule**: Outer layers can import from inner layers, but not vice versa.

## ✨ Benefits

✅ Testable - Easy to write unit tests
✅ Maintainable - Clear separation of concerns  
✅ Scalable - Easy to add new features
✅ Reusable - Hooks and entities can be shared
✅ Type-safe - Entities provide structure

## 📚 Learn More

- [CLEAN_ARCHITECTURE.md](CLEAN_ARCHITECTURE.md) - Detailed documentation
- [MIGRATION.md](MIGRATION.md) - Migration guide from old structure

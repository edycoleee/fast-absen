# Prompt AI - Frontend Boilerplate (React + Vite + Tailwind)

Gunakan prompt ini untuk membuat boilerplate frontend yang konsisten dengan backend RBAC permission-based.

---

## 🤖 PROMPT UNTUK AI

```
Buatkan saya aplikasi frontend React (Vite) yang production-ready sebagai boilerplate admin dashboard.

## Requirements:

### 1. Tech Stack
- React 18+
- Vite 5+
- Tailwind CSS
- Axios
- React Router

### 2. Struktur Project
```
frontend/
├── public/
├── src/
│   ├── core/
│   │   ├── entities/
│   │   └── constants/
│   ├── data/
│   │   ├── api/
│   │   ├── repositories/
│   │   └── storage/
│   ├── domain/
│   │   ├── hooks/
│   │   └── contexts/
│   ├── presentation/
│   │   ├── pages/
│   │   ├── components/
│   │   └── layouts/
│   ├── routes/
│   ├── styles/
│   └── main.jsx
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

### 3. Konsep Clean Architecture (Frontend)
- **presentation**: UI pages/components
- **domain**: hooks/contexts (state, use-cases)
- **data**: repository/API client
- **core**: entities/constants

### 4. Core Features

#### A. Auth + RBAC Permission-based
- Login page
- JWT stored in localStorage
- Axios interceptor untuk Authorization Bearer
- Auto logout jika 401
- `useAuth` context + `isAuthenticated`
- Guarded routes (private route)

#### B. API Client
- Base URL dari `.env`: `VITE_API_BASE_URL`
- Standard response: `{ success, message, data }`
- List response: `data.items`

#### C. Pages (Minimal)
- Dashboard (stats)
- Users (list + modal create/edit/delete)
- Roles (list + modal create/edit/delete)
- Permissions (list + modal create/edit/delete)
- Pegawai (list + modal create/edit/delete)
- Absensi (list)
- Login

#### D. UI
- Tailwind + reusable components (Button, Input, Modal, Table, Alert)
- Responsive layout (sidebar + topbar)

### 5. Data Flow
- Page calls `useX` hook
- Hook calls `Repository`
- Repository uses `apiClient`

### 6. RBAC UI Rules
- Tampilkan halaman hanya jika user punya permission terkait.
- Hide menu jika permission tidak ada.

### 7. Example API Repository
```js
class UserRepository {
  async getAll(page=1, limit=10, search='') {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    const response = await apiClient.get(`/users/?${params}`);
    return response.data;
  }
}
```

### 8. Example Hook
```js
export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const fetchUsers = async (page=1, limit=10, search='') => {
    const response = await UserRepository.getAll(page, limit, search);
    const items = response?.data?.items || [];
    setUsers(items);
  };
  return { users, fetchUsers };
};
```

### 9. Env Example
```
VITE_API_BASE_URL=http://192.168.30.21:8000/api/v1
```

### 10. Output Expected
- Boilerplate siap running `npm install && npm run dev`
- Struktur folder rapi
- Minimal 6 halaman utama
- Auth + RBAC permission-ready

Buatkan dengan struktur lengkap, jangan skip file apapun!
```

---

## ✅ Checklist Hasil

- [ ] Struktur folder sesuai
- [ ] API client + interceptor
- [ ] Auth context + guarded routes
- [ ] RBAC permission-based UI
- [ ] Hooks + repositories
- [ ] Pages + modal CRUD
- [ ] Tailwind setup + layout

---

Happy coding!

import { useEffect, useState, useCallback } from 'react';
import AppClientRepository from '../../../data/repositories/AppClientRepository';
import AuthRepository from '../../../data/repositories/AuthRepository';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers & sub-components
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['App Clients', 'Token Introspect', 'SSO Identity'];

const Badge = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
      ✅ Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      ⛔ Nonaktif
    </span>
  );

const Alert = ({ type, msg, onDismiss }) => {
  if (!msg) return null;
  const styles = type === 'success'
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`flex items-center justify-between p-3 mb-4 rounded-lg border text-sm ${styles}`}>
      <span>{msg}</span>
      <button onClick={onDismiss} className="ml-4 font-bold opacity-60 hover:opacity-100">✕</button>
    </div>
  );
};

const EMPTY_FORM = {
  client_id: '',
  client_name: '',
  description: '',
  client_secret: '',
  allowed_origins: '',
  allowed_scopes: 'identity:read',
  is_active: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal Form – App Client
// ─────────────────────────────────────────────────────────────────────────────

const ClientModal = ({ mode, form, setForm, onSave, onClose, saving, error }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {mode === 'add' ? '➕ Daftarkan App Client' : '✏️ Edit App Client'}
      </h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={mode === 'edit'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            placeholder="Contoh: simrs-web"
            value={form.client_id}
            onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
          />
          <p className="mt-1 text-xs text-gray-400">Identifier unik untuk aplikasi consumer. Tidak bisa diubah.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Aplikasi <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: SIMRS Web RSU Sulfat"
            value={form.client_name}
            onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
          <textarea
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Deskripsi singkat fungsi aplikasi ini"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret {mode === 'edit' && <span className="text-gray-400 text-xs">(kosongkan jika tidak ingin ganti)</span>}
          </label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={mode === 'edit' ? 'Isi untuk mengganti secret' : 'Kosongkan untuk aplikasi publik/trusted'}
            value={form.client_secret}
            onChange={(e) => setForm((f) => ({ ...f, client_secret: e.target.value }))}
          />
          <p className="mt-1 text-xs text-gray-400">Disimpan sebagai SHA-256 hash. Diperlukan untuk machine-to-machine service.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Origins</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://simrs.rsusulfat.id, https://192.10.10.10:3001"
            value={form.allowed_origins}
            onChange={(e) => setForm((f) => ({ ...f, allowed_origins: e.target.value }))}
          />
          <p className="mt-1 text-xs text-gray-400">Comma-separated. Digunakan untuk validasi CORS (opsional).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Scopes</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="identity:read"
            value={form.allowed_scopes}
            onChange={(e) => setForm((f) => ({ ...f, allowed_scopes: e.target.value }))}
          />
          <p className="mt-1 text-xs text-gray-400">Comma-separated. Contoh: identity:read,signature:embed</p>
        </div>

        {mode === 'add' && (
          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Aktifkan langsung</label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 – App Clients
// ─────────────────────────────────────────────────────────────────────────────

const AppClientsTab = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AppClientRepository.getAll();
      setClients(res?.data?.items ?? []);
    } catch {
      setAlert({ type: 'error', msg: 'Gagal memuat daftar app client.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal('add');
  };

  const openEdit = (client) => {
    setEditing(client);
    setForm({
      client_id: client.client_id,
      client_name: client.client_name,
      description: client.description ?? '',
      client_secret: '',
      allowed_origins: client.allowed_origins ?? '',
      allowed_scopes: client.allowed_scopes ?? 'identity:read',
      is_active: client.is_active,
    });
    setFormError('');
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = async () => {
    if (!form.client_id.trim() || !form.client_name.trim()) {
      setFormError('Client ID dan Nama Aplikasi wajib diisi.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        client_id: form.client_id.trim(),
        client_name: form.client_name.trim(),
        description: form.description || null,
        client_secret: form.client_secret || null,
        allowed_origins: form.allowed_origins || null,
        allowed_scopes: form.allowed_scopes || 'identity:read',
        is_active: form.is_active,
      };

      if (modal === 'add') {
        await AppClientRepository.create(payload);
        setAlert({ type: 'success', msg: `App client '${payload.client_id}' berhasil didaftarkan.` });
      } else {
        await AppClientRepository.update(editing.id, payload);
        setAlert({ type: 'success', msg: `App client berhasil diperbarui.` });
      }
      closeModal();
      loadClients();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? 'Gagal menyimpan app client.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (client) => {
    try {
      if (client.is_active) {
        await AppClientRepository.disable(client.id);
        setAlert({ type: 'success', msg: `'${client.client_id}' dinonaktifkan.` });
      } else {
        await AppClientRepository.enable(client.id);
        setAlert({ type: 'success', msg: `'${client.client_id}' diaktifkan kembali.` });
      }
      loadClients();
    } catch {
      setAlert({ type: 'error', msg: 'Gagal mengubah status app client.' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Registry App Client</h2>
          <p className="text-sm text-gray-500">Daftar aplikasi yang diizinkan menggunakan SSO ini sebagai identity provider.</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
        >
          ➕ Daftarkan App
        </button>
      </div>

      <Alert type={alert?.type} msg={alert?.msg} onDismiss={() => setAlert(null)} />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat data...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Belum ada app client terdaftar.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-medium">
              <tr>
                <th className="px-4 py-3 text-left">Client ID</th>
                <th className="px-4 py-3 text-left">Nama Aplikasi</th>
                <th className="px-4 py-3 text-left">Scopes</th>
                <th className="px-4 py-3 text-center">Secret</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Dibuat</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-700">{c.client_id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{c.client_name}</div>
                    {c.description && <div className="text-gray-400 text-xs mt-0.5">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{c.allowed_scopes}</td>
                  <td className="px-4 py-3 text-center">
                    {c.has_secret ? (
                      <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">🔑 Ada</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge active={c.is_active} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs px-3 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(c)}
                        className={`text-xs px-3 py-1 rounded-lg border font-medium ${
                          c.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ClientModal
          mode={modal}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          error={formError}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 – Token Introspect
// ─────────────────────────────────────────────────────────────────────────────

const TokenIntrospectTab = () => {
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleIntrospect = async () => {
    const t = token.trim();
    if (!t) { setError('Masukkan token terlebih dahulu.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      // The backend /auth/introspect uses the Authorization header token
      // We call it via the standard apiClient but pass token manually
      const { default: apiClient } = await import('../../../data/api/client');
      const res = await apiClient.post('/auth/introspect', {}, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setResult(res.data?.data ?? res.data);
    } catch (err) {
      setResult(null);
      setError(err?.response?.data?.detail ?? 'Token tidak valid atau sudah kadaluarsa.');
    } finally {
      setLoading(false);
    }
  };

  const useOwnToken = () => {
    const stored = localStorage.getItem('auth_token') ?? localStorage.getItem('access_token') ?? '';
    setToken(stored);
    setResult(null);
    setError('');
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-800 mb-1">Token Introspect</h2>
      <p className="text-sm text-gray-500 mb-4">
        Validasi JWT access token dan lihat SSO identity yang dikandungnya. Endpoint ini digunakan oleh aplikasi consumer untuk verifikasi token.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Bearer Token</label>
          <button
            onClick={useOwnToken}
            className="text-xs text-blue-600 hover:underline"
          >
            Gunakan token saya sendiri
          </button>
        </div>
        <textarea
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste JWT access token di sini…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleIntrospect}
          disabled={loading}
          className="mt-3 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Memeriksa...' : '🔍 Introspect Token'}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Hasil Introspect</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Active', value: result.active ? '✅ Valid' : '❌ Tidak valid', colored: true },
              { label: 'NIK', value: result.nik ?? '—' },
              { label: 'Username', value: result.username ?? '—' },
              { label: 'Full Name', value: result.full_name ?? '—' },
              { label: 'Subject (user ID)', value: result.sub ?? '—' },
              { label: 'ID Pegawai', value: result.id_pegawai ?? '—' },
              { label: 'Unit ID', value: result.unit_id ?? '—' },
              { label: 'Session ID', value: result.session_id ?? '—' },
              { label: 'Issuer', value: result.iss ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-800 break-all">{value}</p>
              </div>
            ))}
            {result.roles?.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 sm:col-span-2">
                <p className="text-xs text-gray-500 mb-1">Roles</p>
                <div className="flex flex-wrap gap-1">
                  {result.roles.map((r) => (
                    <span key={r} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r}</span>
                  ))}
                </div>
              </div>
            )}
            {result.exp && (
              <div className="bg-gray-50 rounded-lg p-3 sm:col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Expires</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(result.exp * 1000).toLocaleString('id-ID')}
                </p>
              </div>
            )}
          </div>
          <details className="mt-4">
            <summary className="text-xs text-gray-400 cursor-pointer select-none">Lihat raw JSON</summary>
            <pre className="mt-2 text-xs bg-gray-900 text-green-400 rounded-lg p-4 overflow-auto max-h-48">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 – SSO Identity
// ─────────────────────────────────────────────────────────────────────────────

const SsoIdentityTab = () => {
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadIdentity = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await AuthRepository.getSsoIdentity();
      setIdentity(res?.data ?? null);
    } catch {
      setError('Gagal memuat SSO identity. Pastikan sesi masih aktif.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadIdentity(); }, [loadIdentity]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">SSO Identity Anda</h2>
          <p className="text-sm text-gray-500">Data identitas dari token sesi login saat ini yang akan dikirimkan ke aplikasi consumer.</p>
        </div>
        <button
          onClick={loadIdentity}
          disabled={loading}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {loading && !identity && (
        <div className="text-center py-12 text-gray-400">Memuat identitas...</div>
      )}

      {identity && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { label: 'NIK', value: identity.nik ?? '— (belum diisi)', highlight: true },
              { label: 'Username', value: identity.username },
              { label: 'Nama Lengkap', value: identity.full_name ?? identity.pegawai_nama ?? '—' },
              { label: 'ID Pegawai', value: identity.id_pegawai ?? '—' },
              { label: 'Unit ID', value: identity.unit_id ?? '—' },
              { label: 'Session ID', value: identity.session_id ?? '—' },
              { label: 'Issuer', value: identity.iss ?? '—' },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={`rounded-xl p-4 ${highlight ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className={`text-sm font-semibold break-all ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value}</p>
              </div>
            ))}
          </div>

          {identity.roles?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-2">Roles</p>
              <div className="flex flex-wrap gap-2">
                {identity.roles.map((r) => (
                  <span key={r} className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">{r}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Catatan:</strong> Jika kolom <strong>NIK</strong> kosong, data NIK pegawai belum diisi di tabel pegawai.
            NIK diperlukan sebagai global identifier lintas semua aplikasi RS.
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const SsoMonitorPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔐 SSO Monitor</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Kelola aplikasi consumer SSO dan verifikasi token identity.
          Endpoint <code className="bg-gray-100 px-1 rounded text-xs">/auth/introspect</code> digunakan
          oleh SIMRS, finance, dan aplikasi RS lainnya untuk verifikasi sesi pegawai.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === idx
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 0 && <AppClientsTab />}
      {activeTab === 1 && <TokenIntrospectTab />}
      {activeTab === 2 && <SsoIdentityTab />}
    </div>
  );
};

export default SsoMonitorPage;

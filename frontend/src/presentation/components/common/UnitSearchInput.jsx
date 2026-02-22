import { useState, useEffect, useRef } from 'react';
import UnitRepository from '../../../data/repositories/UnitRepository';

/**
 * Searchable unit picker.
 *
 * Props:
 *   value      - string | number (id_unit) or ''
 *   onChange   - (id_unit_string) => void
 *   placeholder - string
 *   disabled   - bool
 */
const UnitSearchInput = ({
  value,
  onChange,
  placeholder = 'Cari nama unit...',
  disabled = false,
}) => {
  const [units, setUnits] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null); // { id_unit, nama_unit }
  const [loadingUnits, setLoadingUnits] = useState(true);
  const containerRef = useRef(null);

  /* ── Load all units once ──────────────────────────────── */
  useEffect(() => {
    setLoadingUnits(true);
    UnitRepository.getAll(0, 500)
      .then((data) => {
        // Backend wraps: { success, message, data: { items, total, skip, limit } }
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data?.items)
          ? data.data.items
          : Array.isArray(data?.items)
          ? data.items
          : [];
        setUnits(list);
      })
      .catch(() => {})
      .finally(() => setLoadingUnits(false));
  }, []);

  /* ── Sync label when value or unit list changes ───────── */
  useEffect(() => {
    if (!value && value !== 0) {
      setSelected(null);
      setQuery('');
      return;
    }
    const match = units.find((u) => String(u.id_unit) === String(value));
    if (match) {
      setSelected(match);
      setQuery(match.nama_unit);
    } else {
      // units not yet loaded — show raw id temporarily
      setSelected(null);
      setQuery(`ID: ${value}`);
    }
  }, [value, units]);

  /* ── Close dropdown on outside click ─────────────────── */
  useEffect(() => {
    const onOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        // Restore display text to selected name (avoid dangling search text)
        if (selected) setQuery(selected.nama_unit);
        else if (!value && value !== 0) setQuery('');
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [selected, value]);

  /* ── Filtered list ────────────────────────────────────── */
  const filtered = query.trim()
    ? units.filter(
        (u) =>
          u.nama_unit?.toLowerCase().includes(query.toLowerCase()) ||
          String(u.id_unit).includes(query.trim())
      )
    : units;

  /* ── Handlers ─────────────────────────────────────────── */
  const handleSelect = (unit) => {
    setSelected(unit);
    setQuery(unit.nama_unit);
    setOpen(false);
    onChange(String(unit.id_unit));
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelected(null);
    setQuery('');
    setOpen(false);
    onChange('');
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value) {
      setSelected(null);
      onChange('');
    }
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div ref={containerRef} className="relative">
      {/* Text search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={loadingUnits ? 'Memuat daftar unit...' : placeholder}
          autoComplete="off"
          className="input-field pr-8"
        />
        {/* Loading spinner inside input */}
        {loadingUnits && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className="h-4 w-4 animate-spin text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </span>
        )}
        {/* Clear button */}
        {!loadingUnits && (query || (value !== '' && value !== null && value !== undefined)) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Hapus pilihan"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl leading-none focus:outline-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Selected unit hint */}
      {selected && (
        <p className="mt-0.5 text-xs text-blue-600">
          ID Unit: <strong>{selected.id_unit}</strong> — {selected.nama_unit}
        </p>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2">
              {loadingUnits ? (
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <svg
                    className="h-4 w-4 animate-spin text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Memuat data unit...
                </span>
              ) : (
                <span className="text-sm text-gray-400">Unit tidak ditemukan</span>
              )}
            </li>
          ) : (
            filtered.map((unit) => (
              <li
                key={unit.id_unit}
                onMouseDown={() => handleSelect(unit)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 ${
                  selected?.id_unit === unit.id_unit
                    ? 'bg-blue-100 font-semibold text-blue-800'
                    : 'text-gray-700'
                }`}
              >
                <span className="w-8 shrink-0 text-right font-mono text-xs text-gray-400">
                  {unit.id_unit}
                </span>
                <span>{unit.nama_unit}</span>
                {unit.status && unit.status !== 'Aktif' && (
                  <span className="ml-auto text-xs text-gray-400">{unit.status}</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default UnitSearchInput;

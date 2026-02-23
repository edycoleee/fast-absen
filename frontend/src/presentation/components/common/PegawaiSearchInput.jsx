import { useState, useEffect, useRef, useCallback } from 'react';
import PegawaiRepository from '../../../data/repositories/PegawaiRepository';

/**
 * Searchable pegawai picker.
 * value: id_pegawai string
 * onChange(id_pegawai: string, nama: string | null)
 */
const PegawaiSearchInput = ({ value, displayValue, onChange, placeholder = 'Cari nama atau ID pegawai...' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(displayValue || '');
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  /* When parent provides an initial value, display it */
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      setQuery('');
    }
  }, [value]);

  /* Sync displayValue when parent changes it (edit modal open / filter reset) */
  useEffect(() => {
    setSelectedLabel(displayValue ?? '');
  }, [displayValue]);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q || q.length < 1) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const data = await PegawaiRepository.getAll(1, 20, q);
      const items = data?.data?.items ?? data?.items ?? [];
      setResults(items);
    } catch (_) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    /* If cleared, propagate empty */
    if (!q) {
      onChange('', null, null);
      setSelectedLabel('');
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (item) => {
    const label = `${item.id_pegawai} – ${item.nama ?? ''}`;
    setSelectedLabel(label);
    setQuery('');
    setOpen(false);
    setResults([]);
    onChange(item.id_pegawai, item.nama ?? null, item.id_unit ?? null);
  };

  const handleClear = () => {
    setSelectedLabel('');
    setQuery('');
    setOpen(false);
    setResults([]);
    onChange('', null, null);
  };

  const displayQuery = selectedLabel || query;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={displayQuery}
          onChange={handleInput}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="input-field pr-8"
        />
        {(selectedLabel || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              Mencari...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 italic">Pegawai tidak ditemukan</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id_pegawai}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 border-b border-gray-100 last:border-b-0"
              >
                <span className="font-medium text-gray-900">{item.nama ?? '-'}</span>
                <span className="ml-2 text-gray-400 text-xs">{item.id_pegawai}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PegawaiSearchInput;

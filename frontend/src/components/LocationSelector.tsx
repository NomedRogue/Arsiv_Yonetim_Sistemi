import React, { useMemo, useState, ChangeEvent, useEffect } from 'react';
import { Location, StorageType, FolderType } from '@/types';
import { useArchive } from '@/context/ArchiveContext';
import { CustomSelect } from '@/components/forms/CustomFormControls';

interface LocationSelectorProps {
  location: Partial<Location>;
  onLocationChange: (field: keyof Location | 'storageType', value: string | number | undefined) => void;
  folderType: FolderType;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ location, onLocationChange, folderType }) => {
  const { getOccupancy, settings, storageStructure } = useArchive();
  const [locationTab, setLocationTab] = useState<StorageType>(location.storageType || StorageType.Kompakt);

  useEffect(() => {
    if (location.storageType) {
      setLocationTab(location.storageType);
    }
  }, [location.storageType]);

  const handleTabChange = (type: StorageType) => {
    setLocationTab(type);
    onLocationChange('storageType', type);
  };

  const occupancyInfo = useMemo(() => {
    const { unit, face, section, shelf, stand } = location;
    if (
      (locationTab === StorageType.Kompakt && unit && face && section && shelf) ||
      (locationTab === StorageType.Stand && stand && shelf)
    ) {
      return getOccupancy(location as Location);
    }
    return null;
  }, [location, getOccupancy, locationTab]);
  
  const faces = useMemo(
    () => location.unit ? storageStructure.kompakt.find(u => u.unit === location.unit)?.faces : [],
    [location.unit, storageStructure]
  );
  
  const sections = useMemo(
    () => location.unit && location.face ? faces?.find(f => f.name === location.face)?.sections : [],
    [location.unit, location.face, faces]
  );
  
  const shelvesForSection = useMemo(() => {
    if (location.unit && location.face && location.section) {
      return sections?.find(s => s.section === location.section)?.shelves || [];
    }
    return [];
  }, [location, sections]);

  const shelvesForStand = useMemo(() => {
    if (location.stand) {
      return storageStructure.stand.find(s => s.stand === location.stand)?.shelves || [];
    }
    return [];
  }, [location.stand, storageStructure]);

  const getOccupancyAlert = () => {
    if (!occupancyInfo) return null;
    const folderWidth = folderType === FolderType.Dar ? settings.darKlasorGenisligi : settings.genisKlasorGenisligi;
    const remainingSpace = occupancyInfo.total - occupancyInfo.used;

    if (remainingSpace < folderWidth) {
      return (
        <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 rounded-lg text-sm mt-2 transition-colors duration-300">
          Bu raf dolu! Seçtiğiniz klasör tipi için yeterli alan yok.
        </div>
      );
    }
    const maxDar = Math.floor(remainingSpace / settings.darKlasorGenisligi);
    const maxGenis = Math.floor(remainingSpace / settings.genisKlasorGenisligi);

    return (
      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm mt-2 transition-colors duration-300">
        Bu raf %{occupancyInfo.percentage.toFixed(0)} dolu. Kalan alan: {maxDar} dar veya {maxGenis} geniş klasör.
      </div>
    );
  };

  return (
    <fieldset className="border p-4 rounded-lg dark:border-gray-600 transition-colors duration-300">
      <legend className="px-2 font-semibold">Lokasyon Seçimi</legend>
      <div className="flex border-b dark:border-gray-700 transition-colors duration-300">
        <button
          type="button"
          onClick={() => handleTabChange(StorageType.Kompakt)}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors duration-300 ${
            locationTab === StorageType.Kompakt
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          Kompakt Dolap
        </button>
        <button
          type="button"
          onClick={() => handleTabChange(StorageType.Stand)}
          className={`px-4 py-2 -mb-px border-b-2 transition-colors duration-300 ${
            locationTab === StorageType.Stand
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 dark:text-gray-400'
          }`}
        >
          Standlar
        </button>
      </div>

      <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {locationTab === StorageType.Kompakt ? (
          <>
            <CustomSelect label="Ünite" name="unit" value={location.unit ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => onLocationChange('unit', e.target.value)}>
              <option value="">Seçiniz</option>
              {storageStructure.kompakt.map((u) => <option key={u.unit} value={u.unit}>{u.unit}</option>)}
            </CustomSelect>
            <CustomSelect label="Yüz" name="face" value={location.face ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => onLocationChange('face', e.target.value)} disabled={!location.unit}>
              <option value="">Seçiniz</option>
              {faces?.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </CustomSelect>
            <CustomSelect label="Bölüm" name="section" value={location.section ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => onLocationChange('section', e.target.value)} disabled={!location.face}>
              <option value="">Seçiniz</option>
              {sections?.map((s) => <option key={s.section} value={s.section}>{s.section}</option>)}
            </CustomSelect>
            <CustomSelect label="Raf" name="shelf" value={location.shelf ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => onLocationChange('shelf', e.target.value)} disabled={!location.section}>
              <option value="">Seçiniz</option>
              {shelvesForSection.map((s) => <option key={s} value={s}>{s}</option>)}
            </CustomSelect>
          </>
        ) : (
          <>
            <CustomSelect label="Stand" name="stand" value={location.stand ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => onLocationChange('stand', e.target.value)}>
              <option value="">Seçiniz</option>
              {storageStructure.stand.map((s) => <option key={s.stand} value={s.stand}>{s.stand}</option>)}
            </CustomSelect>
            <CustomSelect label="Raf" name="shelf" value={location.shelf ?? ''} onChange={(e: ChangeEvent<HTMLSelectElement>) => onLocationChange('shelf', e.target.value)} disabled={!location.stand}>
              <option value="">Seçiniz</option>
              {shelvesForStand.map((shelf) => <option key={shelf} value={shelf}>{shelf}</option>)}
            </CustomSelect>
          </>
        )}
      </div>

      {getOccupancyAlert()}
    </fieldset>
  );
};
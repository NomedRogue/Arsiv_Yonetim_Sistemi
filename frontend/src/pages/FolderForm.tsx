import React, {
  useState,
  useMemo,
  ChangeEvent,
  FormEvent,
  useEffect,
} from 'react';
import { useArchive } from '@/context/ArchiveContext';
import { Category, FolderType, StorageType, Folder, Location } from '@/types';
import { RETENTION_CODES } from '@/constants';
import { UploadCloud, XCircle, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { CustomInput, CustomSelect } from '@/components/forms/CustomFormControls';
import { LocationSelector } from '@/components/LocationSelector';
import * as api from '@/api';

type FormDataType = Omit<
  Folder,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'departmentId'
> & { departmentId: string };

const initialFormData: FormDataType = {
  category: Category.Tibbi,
  departmentId: '',
  clinic: '',
  unitCode: '',
  fileCode: '',
  subject: '',
  specialInfo: '',
  retentionPeriod: 5,
  retentionCode: 'A',
  fileYear: new Date().getFullYear(),
  fileCount: 1,
  folderType: FolderType.Dar,
  location: {
    storageType: StorageType.Kompakt,
    // diğer alanlar isteğe bağlı
  },
  pdfPath: undefined,
};

const RETENTION_CODE_DESCRIPTIONS: { [key: string]: string } = {
  A: 'Devlet Arşivlerine Gönderilir',
  A1: 'Örnek Yıllar Gönderilir',
  A2: 'Örnek Seçilenler Gönderilir',
  A3: 'Özellikli Olanlar Devlet Arşivlerine Gönderilir',
  B: 'Kurumunda Saklanır',
  C: 'Ayıklama İmha Komisyonunca Değerlendirilir',
  D: 'Devlet Arşivlerine Gönderilmez',
};


export const FolderForm: React.FC<{
  editingFolderId: number | null;
  setEditingFolderId: (id: number | null) => void;
  setActivePage: (page: string) => void;
}> = ({ editingFolderId, setEditingFolderId, setActivePage }) => {
  const {
    departments,
    addFolder,
    updateFolder,
    settings,
  } = useArchive();

  const [formData, setFormData] = useState<FormDataType>(initialFormData);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalFolder, setOriginalFolder] = useState<Folder | null>(null);

  const isEditing = editingFolderId !== null;

  useEffect(() => {
    if (isEditing && editingFolderId) {
      const fetchAndSetFolder = async () => {
        try {
          const folderToEdit = await api.getFolder(editingFolderId);
          setOriginalFolder(folderToEdit);
          const {
            id,
            createdAt,
            updatedAt,
            status,
            departmentId,
            ...rest
          } = folderToEdit;
          const nextData: FormDataType = {
            ...rest,
            departmentId: String(departmentId),
          };
          setFormData(nextData);
          if (folderToEdit.pdfPath) {
            setPdfFile({ name: folderToEdit.pdfPath, size: 0 } as File);
          } else {
            setPdfFile(null);
          }
        } catch (error: any) {
          toast.error(`Klasör verileri alınamadı: ${error.message}`);
          setEditingFolderId(null);
        }
      };
      fetchAndSetFolder();
    } else {
      setFormData(initialFormData);
      setPdfFile(null);
      setOriginalFolder(null);
    }
  }, [editingFolderId, isEditing, setEditingFolderId]);


  const filteredDepartments = useMemo(
    () => departments.filter((d) => d.category === formData.category),
    [departments, formData.category]
  );

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => {
      // number input’larda boş değer gelirse 0’a çeviriyoruz (NaN uyarısı olmasın)
      const nextValue =
        type === 'number' ? (value === '' ? '' : Number(value)) : value;

      return {
        ...prev,
        // dinamik key nedeniyle cast gerekli
        [name]: nextValue as any,
      } as FormDataType;
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCategory = e.target.value as Category;
    setFormData((prev) => ({
      ...prev,
      category: newCategory,
      departmentId: '',
    }));
  };

  const handleLocationChange = (
    field: keyof Location | 'storageType',
    value: string | number | undefined
  ) => {
    
    setFormData((prev) => {
      const newLocation = { ...prev.location };
      
      if (field === 'storageType') {
        // Reset location details when storage type changes
        return {
            ...prev,
            location: { storageType: value as StorageType },
        };
      }
      
      if (field === 'unit') {
        newLocation.face = undefined;
        newLocation.section = undefined;
        newLocation.shelf = undefined;
      } else if (field === 'face') {
        newLocation.section = undefined;
        newLocation.shelf = undefined;
      } else if (field === 'section') {
        newLocation.shelf = undefined;
      } else if (field === 'stand') {
        newLocation.shelf = undefined;
      }

      const processedValue = field === 'face' ? (value as string | undefined) : value ? Number(value) : undefined;
      
      return {
          ...prev,
          location: {
              ...newLocation,
              [field]: processedValue as any,
          }
      };
    });
  };

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > settings.pdfBoyutLimiti * 1024 * 1024) {
        toast.error(
          `Dosya boyutu çok büyük. Maksimum boyut ${settings.pdfBoyutLimiti} MB olabilir.`
        );
        return;
      }
      setPdfFile(file);
    }
  };

  const removeFile = () => {
    setPdfFile(null);
    setFormData((prev) => ({ ...prev, pdfPath: undefined }));
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.departmentId) {
      toast.warning('Lütfen bir birim seçin.');
      return;
    }

    setIsSubmitting(true);

    let submittedPdfPath = originalFolder?.pdfPath;

    // 1) Eski dosyayı kaldır
    if (isEditing && originalFolder?.pdfPath && !pdfFile) {
      await fetch(`/api/delete-pdf/${originalFolder.pdfPath}`, {
        method: 'DELETE',
      });
      submittedPdfPath = undefined;
    }

    // 2) Yeni dosya yüklendiyse değiştir
    if (pdfFile && pdfFile.size > 0) {
      if (isEditing && originalFolder?.pdfPath) {
        await fetch(`/api/delete-pdf/${originalFolder.pdfPath}`, {
          method: 'DELETE',
        });
      }
      const formDataForUpload = new FormData();
      formDataForUpload.append('pdf', pdfFile);

      try {
        const uploadResponse = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formDataForUpload,
        });
        if (!uploadResponse.ok) throw new Error('Upload failed');
        const result = await uploadResponse.json();
        submittedPdfPath = result.filename;
      } catch (error) {
        console.error(error);
        toast.error('PDF yüklenirken bir hata oluştu!');
        setIsSubmitting(false);
        return;
      }
    }

    const { departmentId, ...restOfData } = formData;
    const payload = {
      ...restOfData,
      departmentId: Number(departmentId),
      location: formData.location as Location,
      pdfPath: submittedPdfPath,
    };

    if (isEditing && originalFolder && editingFolderId) {
      await updateFolder({ ...originalFolder, ...payload, id: editingFolderId });
    } else {
      await addFolder(payload);
    }

    setIsSubmitting(false);
    setEditingFolderId(null);
    setActivePage('Tüm Klasörler');
  };

  return (
    <div className="p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-archive-dark-panel p-6 rounded-xl shadow-lg max-w-4xl mx-auto space-y-8 transition-colors duration-300"
      >
        <h2 className="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-600 transition-colors duration-300">
          {isEditing ? 'Klasör Düzenle' : 'Yeni Klasör Kayıt'}
        </h2>

        <fieldset className="border p-4 rounded-lg dark:border-gray-600 transition-colors duration-300">
          <legend className="px-2 font-semibold">Klasör Bilgileri</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-medium">
                Kategori (Zorunlu)
              </label>
              <div className="flex items-center space-x-4 p-2.5 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300">
                <input
                  id="cat-tibbi"
                  type="radio"
                  value={Category.Tibbi}
                  name="category"
                  checked={formData.category === Category.Tibbi}
                  onChange={handleCategoryChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="cat-tibbi">Tıbbi</label>
                <input
                  id="cat-idari"
                  type="radio"
                  value={Category.Idari}
                  name="category"
                  checked={formData.category === Category.Idari}
                  onChange={handleCategoryChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="cat-idari">İdari</label>
              </div>
            </div>

            <CustomSelect
              label="Birim Adı"
              name="departmentId"
              value={formData.departmentId}
              onChange={handleInputChange}
              required
            >
              <option value="">Birim seçin...</option>
              {filteredDepartments.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.name}
                </option>
              ))}
            </CustomSelect>

            {formData.category === Category.Tibbi && (
              <CustomInput
                label="Klinik Bilgisi"
                name="clinic"
                value={formData.clinic || ''}
                onChange={handleInputChange}
              />
            )}

            <CustomInput
              label="Birim Kodu"
              name="unitCode"
              value={formData.unitCode || ''}
              onChange={handleInputChange}
            />

            <CustomInput
              label="Dosya Kodu"
              name="fileCode"
              value={formData.fileCode}
              onChange={handleInputChange}
              required
            />

            <CustomInput
              label="Konu Adı"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              className="md:col-span-2"
            />

            <div className="md:col-span-2">
              <label
                htmlFor="specialInfo"
                className="block mb-2 text-sm font-medium"
              >
                Özel Bilgi
              </label>
              <textarea
                name="specialInfo"
                id="specialInfo"
                value={formData.specialInfo || ''}
                onChange={handleInputChange}
                rows={3}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-slate-600 dark:border-gray-500 transition-colors duration-300"
              ></textarea>
            </div>
            
            <div>
              <CustomInput
                label="Saklama Süresi (Yıl)"
                name="retentionPeriod"
                type="number"
                value={formData.retentionPeriod}
                onChange={handleInputChange}
                required
              />
               <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 min-h-[1.5rem]">
                Planda geçen saklama süreleri, dosyanın kapandığı tarihten itibaren saklanması öngörülen süreyi (yıl) ifade eder.
              </p>
            </div>

            <div>
              <CustomSelect
                label="Saklama Kodu"
                name="retentionCode"
                value={formData.retentionCode}
                onChange={handleInputChange}
                required
              >
                {RETENTION_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </CustomSelect>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 min-h-[1.5rem]">
                {RETENTION_CODE_DESCRIPTIONS[formData.retentionCode] || ''}
              </p>
            </div>


            <CustomInput
              label="Dosya Yılı"
              name="fileYear"
              type="number"
              placeholder="YYYY"
              value={formData.fileYear}
              onChange={handleInputChange}
              required
            />

            <CustomInput
              label="Dosya Sayısı"
              name="fileCount"
              type="number"
              value={formData.fileCount}
              onChange={handleInputChange}
              required
            />

            <div>
              <label className="block mb-2 text-sm font-medium">
                Klasör Tipi
              </label>
              <div className="flex items-center space-x-4 p-2.5 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-500 rounded-lg transition-colors duration-300">
                <input
                  id="type-dar"
                  type="radio"
                  value={FolderType.Dar}
                  name="folderType"
                  checked={formData.folderType === FolderType.Dar}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="type-dar">Dar</label>
                <input
                  id="type-genis"
                  type="radio"
                  value={FolderType.Genis}
                  name="folderType"
                  checked={formData.folderType === FolderType.Genis}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="type-genis">Geniş</label>
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="border p-4 rounded-lg dark:border-gray-600 transition-colors duration-300">
          <legend className="px-2 font-semibold">
            PDF İçindekiler Listesi (Opsiyonel)
          </legend>

          {!pdfFile ? (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="flex justify-center items-center w-full"
            >
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-slate-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-slate-600 transition-colors duration-300"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Yüklemek için tıklayın</span>{' '}
                    veya sürükleyip bırakın
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sadece PDF (MAX. {settings.pdfBoyutLimiti}MB)
                  </p>
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleFileChange(e.target.files)
                  }
                />
              </label>
            </div>
          ) : (
            <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-between transition-colors duration-300">
              <div className="flex items-center">
                <FileText className="w-6 h-6 mr-3 text-red-500" />
                <div>
                  <p className="text-sm font-medium">{pdfFile?.name}</p>
                  {pdfFile?.size > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-300"
              >
                <XCircle size={20} />
              </button>
            </div>
          )}
        </fieldset>
        
        <LocationSelector 
            location={formData.location}
            onLocationChange={handleLocationChange}
            folderType={formData.folderType}
        />

        <div className="flex justify-end pt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setEditingFolderId(null);
              setActivePage('Tüm Klasörler');
            }}
            className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 dark:bg-slate-700 dark:text-white dark:border-gray-600 dark:hover:bg-slate-600 transition-colors duration-300 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Kaydediliyor...' : isEditing ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};
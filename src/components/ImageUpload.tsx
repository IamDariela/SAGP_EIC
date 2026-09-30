import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { saveImage, getImage } from '../lib/idb';

interface ImageUploadProps {
  currentPhotoId?: string;
  onImageUploaded: (photoId: string) => void;
  onRemove?: () => void;
}

export default function ImageUpload({ currentPhotoId, onImageUploaded, onRemove }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (currentPhotoId) {
      getImage(currentPhotoId).then(setPreview);
    } else {
      setPreview(null);
    }
  }, [currentPhotoId]);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen excede el límite de 5MB.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato no válido. Use JPG, PNG o WebP.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const id = await saveImage(file);
      const url = await getImage(id);
      setPreview(url);
      onImageUploaded(id);
    } catch (err) {
      console.error(err);
      setError('Error al procesar la imagen.');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Fotografía del Bien
        </label>
        {preview && (
          <button 
            type="button"
            onClick={() => {
              setPreview(null);
              onRemove?.();
            }}
            className="text-[10px] text-red-600 font-bold uppercase hover:underline"
          >
            Quitar
          </button>
        )}
      </div>

      <div className="relative group">
        {preview ? (
          <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100">
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-primary p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <Upload className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full aspect-video flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-primary/50 transition-all group"
          >
            {loading ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <>
                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform mb-3">
                  <Camera className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                </div>
                <p className="text-sm font-medium text-slate-600">Click para subir o tomar foto</p>
                <p className="text-[10px] text-slate-400 mt-1">JPG, PNG o WebP (Max. 5MB)</p>
              </>
            )}
          </button>
        )}
        
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden" 
          onChange={onFileChange} 
        />
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

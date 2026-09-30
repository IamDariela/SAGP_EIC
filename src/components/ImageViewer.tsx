import React, { useState, useEffect } from 'react';
import { X, ZoomIn, Download } from 'lucide-react';
import { getImage } from '../lib/idb';

interface ImageViewerProps {
  photoId: string;
  onClose: () => void;
}

export default function ImageViewer({ photoId, onClose }: ImageViewerProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getImage(photoId).then(setUrl);
  }, [photoId]);

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button 
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
        <img 
          src={url} 
          alt="Vista ampliada" 
          className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" 
        />
      </div>
    </div>
  );
}

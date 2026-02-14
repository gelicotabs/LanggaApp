import React, { useState, useEffect } from 'react';
import { Plus, X, Heart, AlertCircle, CheckCircle} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';

interface GalleryItem {
  id: string;
  url: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: Date;
  liked: boolean;
  likedBy?: string[];
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const Gallery: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [editModalItem, setEditModalItem] = useState<GalleryItem | null>(null);
  const [editedCaption, setEditedCaption] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<GalleryItem | null>(null);
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const convertHeicToJpeg = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      import('heic2any').then((heic2any) => {
        heic2any.default({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9
        }).then((convertedBlob) => {
          const convertedFile = new File(
            [convertedBlob as Blob],
            file.name.replace(/\.heic$/i, '.jpg'),
            {
              type: 'image/jpeg',
              lastModified: Date.now()
            }
          );
          resolve(convertedFile);
        }).catch(reject);
      }).catch(() => {
        reject(new Error('HEIC conversion library not available'));
      });
    });
  };

  const processImage = async (file: File): Promise<File> => {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
      return file;
    }
    if (fileType === 'image/heic' || fileName.endsWith('.heic')) {
      setIsConverting(true);
      showToast('Converting HEIC image to JPEG...', 'info');
      try {
        const convertedFile = await convertHeicToJpeg(file);
        showToast('Image converted successfully! 💕', 'success');
        return convertedFile;
      } catch (error) {
        throw new Error('Failed to convert HEIC image. Please use a JPG/JPEG image instead.');
      } finally {
        setIsConverting(false);
      }
    }
    throw new Error('Please select a JPG, JPEG, or HEIC image file.');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processedFile = await processImage(file);
        setSelectedFile(processedFile);
        setPreviewUrl(URL.createObjectURL(processedFile));
        setShowUploadModal(true);
        e.target.value = '';
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Error processing image', 'error');
        e.target.value = '';
      }
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !caption.trim()) {
      showToast('Please select an image and enter a caption', 'error');
      return;
    }
    setIsUploading(true);
    showToast('Uploading your precious memory... 💖', 'info');
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('caption', caption.trim());
      const response = await fetch('http://localhost:8000/loveconnect/api/upload-photo/', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        const newItem: GalleryItem = {
          id: Date.now().toString(),
          url: data.url,
          caption: caption.trim(),
          uploadedBy: 'You',
          uploadedAt: new Date(),
          liked: false
        };
        setGalleryItems(prev => [newItem, ...prev]);
        setShowUploadModal(false);
        setSelectedFile(null);
        setCaption('');
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        showToast('Photo uploaded successfully! Your love story grows 💕✨', 'success');
      } else {
        showToast(data.error || 'Upload failed. Please try again', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Upload failed. Please check your connection and try again', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditModal = (item: GalleryItem) => {
    setEditModalItem(item);
    setEditedCaption(item.caption);
  };

  const submitEditCaption = async () => {
    if (!editModalItem || !editedCaption.trim()) return;
    try {
      const res = await fetch("http://localhost:8000/loveconnect/api/edit-caption/", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: editModalItem.id, caption: editedCaption.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setGalleryItems(prev =>
          prev.map(i => i.id === editModalItem.id ? { ...i, caption: editedCaption.trim() } : i)
        );
        showToast("Caption updated successfully 📝", 'success');
        setEditModalItem(null);
      } else {
        showToast(data.error || "Failed to update caption", 'error');
      }
    } catch (err) {
      console.error("Edit caption error:", err);
      showToast("Network error while editing", 'error');
    }
  };

  const openDeleteConfirm = (item: GalleryItem) => {
    setDeleteConfirmItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      const res = await fetch("http://localhost:8000/loveconnect/api/delete-photo/", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deleteConfirmItem.id, url: deleteConfirmItem.url })
      });
      const data = await res.json();
      if (res.ok) {
        setGalleryItems(prev => prev.filter(i => i.id !== deleteConfirmItem.id));
        setSelectedImage(null);
        setDeleteConfirmItem(null);
        showToast("Photo deleted 💔", 'success');
      } else {
        showToast(data.error || "Delete failed", 'error');
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Network error while deleting", 'error');
    }
  };

  const handleUploadCancel = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setCaption('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const toggleLike = async (id: string) => {
    const item = galleryItems.find(i => i.id === id);
    if (!item || !currentUserEmail) return;
    try {
      const res = await fetch('http://localhost:8000/loveconnect/api/toggle-like/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok) {
        const isNowLiked = data.liked;
        setGalleryItems(prev =>
          prev.map(i =>
            i.id === id
              ? {
                  ...i,
                  liked: isNowLiked,
                  likedBy: isNowLiked
                    ? [...(i.likedBy || []), currentUserEmail]
                    : (i.likedBy || []).filter(email => email !== currentUserEmail)
                }
              : i
          )
        );
      } else {
        showToast('Failed to toggle like', 'error');
      }
    } catch (err) {
      console.error('Toggle like failed:', err);
      showToast('Network error while liking', 'error');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('loveconnect='))
          ?.split('=')[1];

        const [userRes, galleryRes] = await Promise.all([
          fetch('http://localhost:8000/loveconnect/api/get-user/', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`
            },
            credentials: 'include'
          }),
          fetch('http://localhost:8000/loveconnect/api/gallery/', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`
            },
            credentials: 'include'
          })
        ]);
        const userData = await userRes.json();
        const galleryData = await galleryRes.json();
        if (userRes.ok && galleryRes.ok && galleryData.gallery) {
          setCurrentUserEmail(userData.email);
          const items: GalleryItem[] = galleryData.gallery.map((item: any) => ({
            id: item._id,
            url: item.url,
            caption: item.caption,
            uploadedBy: item.uploadedBy,
            uploadedAt: new Date(item.uploadedAt),
            liked: item.likedBy?.includes(userData.email),
            likedBy: item.likedBy ?? []
          }));
          setGalleryItems(items);
        } else {
          console.error('Error fetching gallery:', galleryData.error);
        }
      } catch (err) {
        console.error('Fetch failed:', err);
        showToast('Failed to load gallery. Please refresh the page', 'error');
      }
    };

    const fetchUser = async () => {
      const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('loveconnect='))
          ?.split('=')[1];

      const res = await fetch("http://localhost:8000/loveconnect/api/get-user/", {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUserEmail(data.email);
      }
    };
    fetchUser();
    fetchGallery();
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: `url('../../assets/background4.jpg')`,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Fixed overlay for transparency - THIS IS THE ONLY OVERLAY */}
      <div
        className={`fixed inset-0 ${
          isDarkMode ? 'bg-black/70' : 'bg-white/80'
        } pointer-events-none`}
      />

      {/* Content wrapper - above overlay */}
      <div className="relative z-10">
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`
                flex items-center gap-3 p-4 rounded-xl shadow-lg backdrop-blur-sm
                border-l-4 min-w-80 max-w-96 transform transition-all duration-300 ease-in-out
                animate-slide-in
                ${toast.type === 'success'
                  ? 'bg-gradient-to-r from-pink-50/95 to-rose-50/95 border-pink-400 text-pink-800'
                  : toast.type === 'error'
                    ? 'bg-gradient-to-r from-red-50/95 to-pink-50/95 border-red-400 text-red-800'
                    : 'bg-gradient-to-r from-purple-50/95 to-pink-50/95 border-purple-400 text-purple-800'
                }
              `}
            >
              <div className="flex-shrink-0">
                {toast.type === 'success' && (
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                    <CheckCircle size={18} className="text-pink-600" />
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle size={18} className="text-red-600" />
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Heart size={18} className="text-purple-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-5">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className={`border-b backdrop-blur-sm ${
          isDarkMode ? 'border-pink-700 bg-gray-800/80' : 'border-pink-200 bg-white/80'
        } p-4 fixed w-full top-0 left-0 z-40 shadow-sm`}>
          <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto">
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Our Gallery</h1>
            <div className="flex items-center mt-2 sm:mt-0">
              <button
                onClick={() => setShowOnlyLiked(!showOnlyLiked)}
                className={`px-3 py-1 text-sm rounded-full transition mr-2 backdrop-blur-sm ${
                  showOnlyLiked 
                    ? 'bg-pink-600/90 text-white' 
                    : isDarkMode 
                      ? 'bg-gray-700/80 text-gray-200' 
                      : 'bg-gray-200/80 text-gray-700'
                }`}
              >
                {showOnlyLiked ? 'Liked Only' : 'All Posts'}
              </button>
              <label htmlFor="upload-image" className="p-2 bg-pink-600/90 text-white rounded-full hover:bg-pink-700 cursor-pointer transition-all duration-200">
                <Plus size={20} />
              </label>
              <input
                id="upload-image"
                type="file"
                accept="image/jpeg,image/jpg,.heic,.HEIC"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
          {galleryItems.length > 0 && (
            <p className={`text-sm mt-2 text-center sm:text-left max-w-7xl mx-auto ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {galleryItems.length} precious memories
            </p>
          )}
        </div>

        {/* Gallery Grid */}
        <div className="p-4 pt-28 pb-8 max-w-7xl mx-auto">
          {(isUploading || isConverting) && (
            <div className={`rounded-xl p-4 mb-4 shadow-sm backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 bg-pink-600 rounded-full animate-pulse"></div>
                <span className={isDarkMode ? 'text-gray-200' : 'text-gray-600'}>
                  {isConverting ? 'Converting image...' : 'Uploading...'}
                </span>
              </div>
            </div>
          )}
          {galleryItems.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm ${
                isDarkMode ? 'bg-pink-100/80' : 'bg-pink-100/80'
              }`}>
                <Plus className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>No photos yet</h3>
              <p className={`mb-4 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Start building your gallery together!</p>
              <p className={`text-xs mb-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Supports JPG, JPEG, and HEIC images</p>
              <label htmlFor="upload-image" className="bg-pink-600/90 text-white px-6 py-2 rounded-lg hover:bg-pink-700 cursor-pointer inline-block transition-all duration-200">
                Upload First Photo
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(showOnlyLiked ? galleryItems.filter(i => i.liked) : galleryItems).map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border backdrop-blur-sm ${
                    isDarkMode 
                      ? 'bg-gray-800/90 border-pink-700' 
                      : 'bg-white/90 border-pink-500'
                  }`}
                  onClick={() => setSelectedImage(item)}
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.caption}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <p className={`text-sm line-clamp-2 ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>{item.caption}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>{item.uploadedBy}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(item.id);
                        }}
                        className={`p-1 rounded-full transition-colors ${
                          item.liked 
                            ? 'text-pink-600' 
                            : isDarkMode 
                              ? 'text-gray-400 hover:text-pink-300' 
                              : 'text-gray-400 hover:text-pink-600'
                        }`}
                      >
                        <Heart size={16} fill={item.liked ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className={`rounded-xl max-w-md w-full max-h-full overflow-hidden backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
            }`}>
              <div className={`flex items-center justify-between p-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>Add Photo</h3>
                <button
                  onClick={handleUploadCancel}
                  className={`p-1 ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-gray-200' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  disabled={isConverting}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                {previewUrl && (
                  <div className="mb-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    {selectedFile && (
                      <p className={`text-xs mt-1 text-center ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {selectedFile.type === 'image/jpeg' ? 'JPEG' : selectedFile.type} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                )}
                <div className="mb-4">
                  <label htmlFor="caption-input" className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Caption
                  </label>
                  <textarea
                    id="caption-input"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption for your photo..."
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 backdrop-blur-sm ${
                      isDarkMode 
                        ? 'bg-gray-700/80 border-gray-600 text-gray-200' 
                        : 'bg-white/80 border-gray-300'
                    }`}
                    rows={3}
                    disabled={isConverting}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleUploadCancel}
                    className={`flex-1 py-2 px-4 border rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700/80' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50/80'
                    }`}
                    disabled={isUploading || isConverting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadSubmit}
                    disabled={isUploading || isConverting || !caption.trim()}
                    className="flex-1 py-2 px-4 bg-pink-600/90 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400/50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isConverting ? 'Converting...' : isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className={`max-w-4xl w-full max-h-full overflow-y-auto rounded-xl backdrop-blur-sm ${
                isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className={`flex items-center justify-between p-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className={`font-semibold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>{selectedImage.uploadedBy}</span>
                  <span className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>{formatDate(selectedImage.uploadedAt)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => toggleLike(selectedImage.id)} 
                    className={`p-2 rounded-full transition-colors ${
                      selectedImage.liked 
                        ? 'text-pink-600' 
                        : isDarkMode 
                          ? 'text-gray-400 hover:text-pink-300' 
                          : 'text-gray-400 hover:text-pink-600'
                    }`}
                  >
                    <Heart size={20} fill={selectedImage.liked ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => openEditModal(selectedImage)} 
                    className={`p-2 transition-colors ${
                      isDarkMode 
                        ? 'text-pink-300 hover:text-pink-400' 
                        : 'text-pink-500 hover:text-pink-700'
                    }`}
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => openDeleteConfirm(selectedImage)} 
                    className={`p-2 transition-colors ${
                      isDarkMode 
                        ? 'text-red-300 hover:text-red-400' 
                        : 'text-red-500 hover:text-red-700'
                    }`}
                  >
                    🗑
                  </button>
                  <button 
                    onClick={() => setSelectedImage(null)} 
                    className={`p-2 ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-gray-200' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.caption}
                  className="w-full h-auto max-h-96 object-contain rounded-lg"
                />
                <p className={`mt-4 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>{selectedImage.caption}</p>
              </div>
            </div>
          </div>
        )}

        {/* Edit Caption Modal */}
        {editModalItem && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
            <div className={`rounded-xl w-full max-w-md shadow-xl p-6 backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>Edit Caption</h3>
              <textarea
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-gray-700/80 border-gray-600 text-gray-200' 
                    : 'bg-white/80 border-pink-200'
                }`}
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={3}
              />
              <div className="mt-4 flex justify-end space-x-3">
                <button 
                  onClick={() => setEditModalItem(null)} 
                  className={`px-4 py-2 transition-colors ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-gray-200' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={submitEditCaption} 
                  className="px-4 py-2 bg-pink-600/90 text-white rounded-lg hover:bg-pink-700 transition-all duration-200"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmItem && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
            <div className={`rounded-xl w-full max-w-sm shadow-xl p-6 text-center backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
            }`}>
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>Delete Photo?</h3>
              <p className={`mt-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>This memory will be removed permanently.</p>
              <div className="mt-6 flex justify-center space-x-4">
                <button 
                  onClick={() => setDeleteConfirmItem(null)} 
                  className={`px-4 py-2 border rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-400 hover:bg-gray-700/80' 
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50/80'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="px-4 py-2 bg-red-500/90 text-white rounded-lg hover:bg-red-600 transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Gallery;
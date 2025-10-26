import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const Options = () => {
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [mangaOptions, setMangaOptions] = useState({
    enabled: false,
    readingDirection: 'right-to-left', // 'right-to-left' or 'left-to-right'
    textContrastEnhancement: true,
    speechBubbleDetection: true,
    panelBoundaryDetection: true,
    fontOptimization: true,
    imagePreprocessing: 'auto' // 'auto', 'manga', 'standard'
  });

  useEffect(() => {
    // Load existing options from chrome storage
    chrome.storage.sync.get(['apiEndpoint', 'mangaOptions'], (result) => {
      if (result.apiEndpoint) {
        setApiEndpoint(result.apiEndpoint);
      }
      if (result.mangaOptions) {
        setMangaOptions(prevOptions => ({
          ...prevOptions,
          ...result.mangaOptions
        }));
      }
    });
  }, []);

  const saveOptions = () => {
    chrome.storage.sync.set({ 
      apiEndpoint,
      mangaOptions 
    }, () => {
      // Create notification div
      const notification = document.createElement('div');
      notification.textContent = 'Options saved successfully!';
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    });
  };

  const handleMangaOptionChange = (key, value) => {
    setMangaOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetMangaOptions = () => {
    setMangaOptions({
      enabled: false,
      readingDirection: 'right-to-left',
      textContrastEnhancement: true,
      speechBubbleDetection: true,
      panelBoundaryDetection: true,
      fontOptimization: true,
      imagePreprocessing: 'auto'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">OCR Translator Options</h1>
        <p className="text-gray-600">Configure your text translation and image processing preferences</p>
      </header>

      {/* API Settings Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">API Settings</h2>
        <div className="mb-4">
          <label htmlFor="api-endpoint" className="block text-sm font-medium text-gray-700 mb-2">
            API Endpoint
          </label>
          <input
            type="text"
            id="api-endpoint"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your API endpoint URL"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
          />
          <p className="mt-1 text-sm text-gray-500">
            The API endpoint for text translation services
          </p>
        </div>
      </section>

      {/* Manga Image Processing Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-700">Manga Image Processing</h2>
            <p className="text-gray-600 mt-1">Specialized settings for manga and comic translations</p>
          </div>
          <button
            onClick={resetMangaOptions}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Enable Manga Mode */}
        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={mangaOptions.enabled}
              onChange={(e) => handleMangaOptionChange('enabled', e.target.checked)}
            />
            <div className={`relative w-12 h-6 transition-colors duration-200 ease-in-out rounded-full ${mangaOptions.enabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${mangaOptions.enabled ? 'transform translate-x-6' : ''}`}></div>
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              Enable Manga Processing Mode
            </span>
          </label>
          <p className="ml-15 mt-1 text-sm text-gray-500">
            Activate specialized image processing optimized for manga and comic books
          </p>
        </div>

        {/* Manga Options - Only show when enabled */}
        {mangaOptions.enabled && (
          <div className="space-y-6 pl-4 border-l-2 border-blue-200">
            {/* Reading Direction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Reading Direction
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="readingDirection"
                    value="right-to-left"
                    checked={mangaOptions.readingDirection === 'right-to-left'}
                    onChange={(e) => handleMangaOptionChange('readingDirection', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Right to Left (Japanese/Korean)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="readingDirection"
                    value="left-to-right"
                    checked={mangaOptions.readingDirection === 'left-to-right'}
                    onChange={(e) => handleMangaOptionChange('readingDirection', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Left to Right (Western)</span>
                </label>
              </div>
            </div>

            {/* Image Preprocessing */}
            <div>
              <label htmlFor="imagePreprocessing" className="block text-sm font-medium text-gray-700 mb-2">
                Image Preprocessing Mode
              </label>
              <select
                id="imagePreprocessing"
                value={mangaOptions.imagePreprocessing}
                onChange={(e) => handleMangaOptionChange('imagePreprocessing', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="auto">Auto (Smart Detection)</option>
                <option value="manga">Manga Mode (High Contrast)</option>
                <option value="standard">Standard Mode</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Choose how images should be preprocessed before OCR
              </p>
            </div>

            {/* Processing Options */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Processing Features</h3>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mangaOptions.textContrastEnhancement}
                  onChange={(e) => handleMangaOptionChange('textContrastEnhancement', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm text-gray-700">Text Contrast Enhancement</span>
                  <p className="text-xs text-gray-500">Improve text visibility in manga panels</p>
                </div>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mangaOptions.speechBubbleDetection}
                  onChange={(e) => handleMangaOptionChange('speechBubbleDetection', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm text-gray-700">Speech Bubble Detection</span>
                  <p className="text-xs text-gray-500">Automatically identify and process speech bubbles</p>
                </div>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mangaOptions.panelBoundaryDetection}
                  onChange={(e) => handleMangaOptionChange('panelBoundaryDetection', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm text-gray-700">Panel Boundary Detection</span>
                  <p className="text-xs text-gray-500">Recognize manga panel boundaries for better text grouping</p>
                </div>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mangaOptions.fontOptimization}
                  onChange={(e) => handleMangaOptionChange('fontOptimization', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm text-gray-700">Manga Font Optimization</span>
                  <p className="text-xs text-gray-500">Optimize OCR for common manga fonts and handwritten text</p>
                </div>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          onClick={saveOptions}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Save All Options
        </button>
      </div>

      {/* Info Section */}
      <footer className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">About Manga Processing Mode</h3>
        <p className="text-sm text-blue-800">
          When enabled, the extension will use specialized image processing techniques optimized for manga and comic books. 
          This includes enhanced contrast adjustment, speech bubble recognition, and text extraction algorithms tuned for 
          stylized fonts commonly found in graphic novels.
        </p>
      </footer>
    </div>
  );
};

// Mount the React component
const root = createRoot(document.getElementById('root'));
root.render(<Options />);

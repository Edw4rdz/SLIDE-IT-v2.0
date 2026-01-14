import React from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { TEMPLATE_THUMB_OVERRIDES } from '../constants';
import { buildTemplateFallbackThumb } from '../utils';

const TemplateSidebar = ({
  isSidebarOpen,
  setIsSidebarOpen,
  loadingTemplates,
  templates,
  selectedTemplateId,
  handleTemplateChange
}) => {
  return (
    <>
      <div className="sidebar-content-wrapper">
        <div className="sidebar-header">
          <h2>🎨 Templates</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="sidebar-toggle">
            <FaArrowLeft />
          </button>
        </div>

        {loadingTemplates ? (
          <p className="loading">Loading templates...</p>
        ) : templates.length > 0 ? (
          <div className="template-gallery">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`template-item ${selectedTemplateId === tpl.id ? 'selected' : ''}`}
                onClick={() => handleTemplateChange(tpl.id, templates)}
              >
                {(() => {
                  const src = TEMPLATE_THUMB_OVERRIDES[tpl.name] || tpl.thumbnail;
                  return (
                    <img
                      src={src}
                      alt={tpl.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = buildTemplateFallbackThumb(tpl.name);
                      }}
                    />
                  );
                })()}
                <p>{tpl.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No pre-built templates found.</p>
        )}
      </div>
    </>
  );
};

export default TemplateSidebar;

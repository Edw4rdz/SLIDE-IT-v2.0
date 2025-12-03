# Content Body Redesign - WYSIWYG Style

## Problem
Current design uses input/textarea fields with visible borders, making it look like form fields rather than actual slide content.

## Solution
Replace form inputs with `contentEditable` divs that look like the actual slide content.

## Changes Needed in EditPreview.js

**Around line 3588-3662**, replace the entire `slide-content-area` div with this:

```jsx
<div className="slide-content-area" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '400px' }}>
  {/* Title - Direct editing */}
  <div 
    contentEditable
    suppressContentEditableWarning
    onBlur={(e) => handleSlideChange(s.id, 'title', e.currentTarget.textContent)}
    style={{
      color: s.titleColor || titleColor || '#000',
      fontFamily: s.styles?.titleFont || theme.font,
      fontSize: `${s.styles?.titleSize || 32}px`,
      fontWeight: s.styles?.titleBold ? 700 : 400,
      fontStyle: s.styles?.titleItalic ? 'italic' : 'normal',
      outline: 'none',
      minHeight: '40px',
      padding: '8px',
      borderRadius: '4px',
      cursor: 'text',
      transition: 'background 0.2s'
    }}
    onFocus={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    onBlur={(e) => { 
      handleSlideChange(s.id, 'title', e.currentTarget.textContent);
      e.currentTarget.style.background = 'transparent';
    }}
  >
    {s.title || 'Click to edit title...'}
  </div>

  {/* Content - Direct editing */}
  <div 
    contentEditable
    suppressContentEditableWarning
    style={{
      color: s.textColor || textColor || '#333',
      fontFamily: s.styles?.textFont || theme.font,
      fontSize: `${s.styles?.textSize || 16}px`,
      fontWeight: s.styles?.textBold ? 700 : 400,
      fontStyle: s.styles?.textItalic ? 'italic' : 'normal',
      textAlign: s.styles?.textAlign || 'left',
      outline: 'none',
      flex: 1,
      padding: '8px',
      borderRadius: '4px',
      cursor: 'text',
      whiteSpace: 'pre-wrap',
      lineHeight: 1.8,
      transition: 'background 0.2s'
    }}
    onFocus={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    onBlur={(e) => {
      const text = e.currentTarget.textContent;
      const processedValue = convertQuotesToMarkdown(text);
      handleSlideChange(s.id, 'bullets', processedValue);
      e.currentTarget.style.background = 'transparent';
    }}
  >
    {(s.bullets || []).map(b => replaceMarkdownBold(b)).join('\n') || 'Click to edit content...'}
  </div>
</div>
```

## Benefits
✅ No visible borders or input fields
✅ Looks like the actual slide content
✅ Click anywhere to edit
✅ Subtle hover effect (light background)
✅ WYSIWYG editing experience
✅ Clean, professional appearance

## To Apply
1. Find line 3588 in `EditPreview.js`
2. Replace the entire `<div className="slide-content-area">` block (including all nested divs with form-group, input, and textarea)
3. Replace with the new contentEditable design above
4. Restart frontend

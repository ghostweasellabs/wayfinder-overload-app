export function generatePrintHTML(formData, fieldConfig) {
  // Validate inputs
  if (!formData || typeof formData !== 'object') {
    throw new Error('Invalid formData: must be an object');
  }
  if (!fieldConfig || !fieldConfig.fields || !Array.isArray(fieldConfig.fields)) {
    throw new Error('Invalid fieldConfig: must have a fields array');
  }

  const fields = fieldConfig.fields;
  
  const fieldsHTML = fields
    .map(field => {
      const value = formData[field.name] || '';
      if (!value) return '';
      
      return `
        <div class="print-field">
          <div class="print-label">${field.label || field.name}:</div>
          <div class="print-value">${escapeHtml(value)}</div>
        </div>
      `;
    })
    .filter(html => html)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WayFinder Expedition Log</title>
  <style>
    @page {
      margin: 1in;
      size: letter;
    }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background: #f4f5f7;
    }
    
    .print-header {
      text-align: center;
      margin-bottom: 2em;
      border-bottom: 3px solid #304b7a;
      padding-bottom: 1em;
    }
    
    .print-header h1 {
      margin: 0;
      font-size: 24pt;
      font-weight: bold;
      color: #304b7a;
    }
    
    .print-field {
      margin-bottom: 1.5em;
      page-break-inside: avoid;
    }
    
    .print-label {
      font-weight: bold;
      margin-bottom: 0.3em;
      color: #304b7a;
      font-size: 11pt;
    }
    
    .print-value {
      padding-left: 1em;
      border-left: 3px solid #dba451;
      min-height: 1.2em;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #222;
    }
    
    .print-footer {
      margin-top: 2em;
      padding-top: 1em;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10pt;
      color: #666;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .print-field {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>WayFinder Expedition Log</h1>
  </div>
  
  <div class="print-content">
    ${fieldsHTML}
  </div>
  
  <div class="print-footer">
    Generated on ${new Date().toLocaleString()}
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') {
    text = String(text);
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}


import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveForm: (formData) => ipcRenderer.invoke('save-form', formData),
  loadForms: () => ipcRenderer.invoke('load-forms'),
  loadForm: (filename) => ipcRenderer.invoke('load-form', filename),
  deleteForm: (filename) => ipcRenderer.invoke('delete-form', filename),
  getFieldConfig: () => ipcRenderer.invoke('get-field-config'),
  printForm: (htmlContent) => ipcRenderer.invoke('print-form', htmlContent)
});


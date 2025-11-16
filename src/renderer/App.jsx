import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FormList from './components/FormList';
import { generatePrintHTML } from './utils/printTemplate';
import { useToast } from './hooks/useToast.jsx';
import { ConfirmDialog } from './components/ConfirmDialog';

function App() {
  const [fieldConfig, setFieldConfig] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFormList, setShowFormList] = useState(false);
  const [savedForms, setSavedForms] = useState([]);
  const [activeTab, setActiveTab] = useState('main');
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { showToast, Toast } = useToast();

  useEffect(() => {
    loadFieldConfig();
    loadForms();
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  const loadFieldConfig = async () => {
    try {
      const result = await window.electronAPI.getFieldConfig();
      if (result.success) {
        setFieldConfig(result.config);
        const initialData = {};
        result.config.fields?.forEach(field => {
          if (field.type === 'checkbox') {
            initialData[field.name] = false;
          } else {
            initialData[field.name] = '';
          }
        });
        setFormData(initialData);
      } else {
        setError('Field configuration not found. Please ensure field-config.json exists.');
      }
    } catch (err) {
      setError(`Failed to load field config: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadForms = async () => {
    try {
      const result = await window.electronAPI.loadForms();
      if (result.success) {
        setSavedForms(result.forms);
      }
    } catch (err) {
      console.error('Failed to load forms:', err);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        createdAt: new Date().toISOString()
      };
      const result = await window.electronAPI.saveForm(dataToSave);
      if (result.success) {
        showToast('Form saved successfully!', 'success');
        loadForms();
      } else {
        showToast(`Failed to save: ${result.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error saving form: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const htmlContent = generatePrintHTML(formData, fieldConfig);
      await window.electronAPI.printForm(htmlContent);
      showToast('Print dialog opened', 'success');
    } catch (err) {
      showToast(`Error printing: ${err.message}`, 'error');
    } finally {
      setPrinting(false);
    }
  };

  const handleLoadForm = async (filename) => {
    try {
      const result = await window.electronAPI.loadForm(filename);
      if (result.success) {
        setFormData(result.formData);
        setShowFormList(false);
        showToast('Form loaded successfully', 'success');
      } else {
        showToast(`Failed to load form: ${result.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error loading form: ${err.message}`, 'error');
    }
  };

  const handleDeleteForm = async (filename) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Form',
      description: 'Are you sure you want to delete this form? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const result = await window.electronAPI.deleteForm(filename);
          if (result.success) {
            showToast('Form deleted successfully', 'success');
            loadForms();
          } else {
            showToast(`Failed to delete: ${result.error}`, 'error');
          }
        } catch (err) {
          showToast(`Error deleting form: ${err.message}`, 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
      onClose: () => setConfirmDialog(null)
    });
  };

  const handleClear = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear Form',
      description: 'Are you sure you want to clear all form data? This action cannot be undone.',
      onConfirm: () => {
        const initialData = {};
        fieldConfig?.fields?.forEach(field => {
          if (field.type === 'checkbox') {
            initialData[field.name] = false;
          } else {
            initialData[field.name] = '';
          }
        });
        setFormData(initialData);
        showToast('Form cleared', 'success');
        setConfirmDialog(null);
      },
      onClose: () => setConfirmDialog(null)
    });
  };

  const organizeFieldsBySection = () => {
    if (!fieldConfig?.fields) return {};
    
    const sections = {
      main: { title: 'Main Log', fields: [] },
      route: { title: 'Route & Fuel', fields: [] },
      team: { title: 'Team & Objectives', fields: [] },
      environmental: { title: 'Environmental', fields: [] },
      maintenance: { title: 'Maintenance', fields: [] },
      leadership: { title: 'Leadership & Reflection', fields: [] }
    };

    fieldConfig.fields.forEach(field => {
      const name = field.name.toLowerCase();
      
      if (name.includes('odo') || name.includes('fuel') || name.includes('mpg') || name.includes('dist') || name.includes('tire') || name.includes('psi')) {
        sections.route.fields.push(field);
      } else if (name.includes('team') || name.includes('role') || name.includes('name') || name.includes('objectives') || name.includes('notes') && name.includes('team')) {
        sections.team.fields.push(field);
      } else if (name.includes('weather') || name.includes('temp') || name.includes('wind') || name.includes('sky') || name.includes('precip') || name.includes('terrain') || name.includes('sunrise') || name.includes('sunset') || name.includes('environmental')) {
        sections.environmental.fields.push(field);
      } else if (name.includes('maintenance') || name.includes('oil') || name.includes('coolant') || name.includes('brakes') || name.includes('tires') || name.includes('suspension') || name.includes('lights') || name.includes('winch') || name.includes('recovery') || name.includes('electrics')) {
        sections.maintenance.fields.push(field);
      } else if (name.includes('leadership') || name.includes('cohesion') || name.includes('awareness') || name.includes('journal') || name.includes('lessons') && name.includes('carry')) {
        sections.leadership.fields.push(field);
      } else {
        sections.main.fields.push(field);
      }
    });

    return sections;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (showFormList) {
    return (
      <FormList
        forms={savedForms}
        onLoad={handleLoadForm}
        onDelete={handleDeleteForm}
        onBack={() => setShowFormList(false)}
      />
    );
  }

  const sections = organizeFieldsBySection();

  return (
    <div className="min-h-screen bg-background transition-colors">
      {Toast}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          description={confirmDialog.description}
          onConfirm={confirmDialog.onConfirm}
          onClose={confirmDialog.onClose}
        />
      )}
      <div className="max-w-7xl mx-auto p-6">
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold">WayFinder Expedition Log</CardTitle>
                <CardDescription className="mt-2">Complete your expedition documentation</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={toggleTheme} title="Toggle theme">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4"/>
                      <path d="M12 2v2"/>
                      <path d="M12 20v2"/>
                      <path d="m4.93 4.93 1.41 1.41"/>
                      <path d="m17.66 17.66 1.41 1.41"/>
                      <path d="M2 12h2"/>
                      <path d="M20 12h2"/>
                      <path d="m6.34 17.66-1.41 1.41"/>
                      <path d="m19.07 4.93-1.41 1.41"/>
                    </svg>
                  </Button>
                  <Button variant="outline" onClick={() => setShowFormList(true)}>
                    Saved Forms
                  </Button>
                  <Button variant="outline" onClick={handleClear} disabled={saving || printing}>
                    Clear
                  </Button>
                  <Button variant="outline" onClick={handleSave} disabled={saving || printing}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90" disabled={saving || printing}>
                    {printing ? 'Printing...' : 'Print'}
                  </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="main">Main</TabsTrigger>
                <TabsTrigger value="route">Route & Fuel</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="environmental">Environmental</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="leadership">Leadership</TabsTrigger>
              </TabsList>
              
              {Object.entries(sections).map(([key, section]) => (
                <TabsContent key={key} value={key} className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.fields.map((field, index) => (
                      <div key={index} className="space-y-2">
                        {field.type !== 'checkbox' && (
                          <Label htmlFor={field.name} className="text-sm font-medium">
                            {field.label || field.name}
                          </Label>
                        )}
                        {field.type === 'textarea' ? (
                          <Textarea
                            id={field.name}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                        ) : field.type === 'date' ? (
                          <Input
                            id={field.name}
                            type="date"
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                          />
                        ) : field.type === 'number' ? (
                          <Input
                            id={field.name}
                            type="number"
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                          />
                        ) : field.type === 'checkbox' ? (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={field.name}
                              checked={formData[field.name] === true || formData[field.name] === 'true'}
                              onChange={(e) => handleInputChange(field.name, e.target.checked)}
                            />
                            <label htmlFor={field.name} className="text-sm font-normal cursor-pointer">
                              {field.label}
                            </label>
                          </div>
                        ) : (
                          <Input
                            id={field.name}
                            type="text"
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function FormList({ forms, onLoad, onDelete, onBack }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Saved Forms</CardTitle>
                <CardDescription>Load or delete previously saved forms</CardDescription>
              </div>
              <Button variant="outline" onClick={onBack}>
                Back to Form
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No saved forms yet
              </div>
            ) : (
              <div className="space-y-4">
                {forms.map((form) => (
                  <Card key={form.filename}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{form.filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(form.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onLoad(form.filename)}
                          >
                            Load
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(form.filename)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FormList;


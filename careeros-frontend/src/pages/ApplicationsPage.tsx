import { useState } from 'react';
import { api, Application } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';

interface ApplicationsPageProps {
  applications: Application[];
  onUpdate: () => void;
}

const STATUS_COLUMNS = [
  { id: 'saved', label: 'Saved', color: 'bg-gray-100' },
  { id: 'applied', label: 'Applied', color: 'bg-blue-100' },
  { id: 'interview', label: 'Interview', color: 'bg-yellow-100' },
  { id: 'offer', label: 'Offer', color: 'bg-green-100' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-100' },
] as const;

export function ApplicationsPage({ applications, onUpdate }: ApplicationsPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [formData, setFormData] = useState({
    job_title: '',
    company: '',
    job_url: '',
    job_description: '',
    status: 'saved' as Application['status'],
    notes: '',
    match_score: null as number | null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      job_title: '',
      company: '',
      job_url: '',
      job_description: '',
      status: 'saved',
      notes: '',
      match_score: null,
    });
    setEditingApplication(null);
  };

  const openEditDialog = (application: Application) => {
    setEditingApplication(application);
    setFormData({
      job_title: application.job_title || '',
      company: application.company || '',
      job_url: application.job_url || '',
      job_description: application.job_description || '',
      status: application.status,
      notes: application.notes || '',
      match_score: application.match_score,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingApplication) {
        await api.applications.update(editingApplication.id, formData);
      } else {
        await api.applications.create(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Failed to save application:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    
    try {
      await api.applications.delete(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  };

  const handleStatusChange = async (application: Application, newStatus: Application['status']) => {
    try {
      await api.applications.update(application.id, { ...application, status: newStatus });
      onUpdate();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Application Tracker</h2>
          <p className="text-sm text-gray-500">Track your job applications through the pipeline</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingApplication ? 'Edit Application' : 'Add Application'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Inc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_url">Job URL</Label>
                <Input
                  id="job_url"
                  value={formData.job_url}
                  onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Application['status'] })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {STATUS_COLUMNS.map(col => (
                    <option key={col.id} value={col.id}>{col.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_description">Job Description</Label>
                <Textarea
                  id="job_description"
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  placeholder="Paste the job description here..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any notes about this application..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {STATUS_COLUMNS.map(column => (
          <div key={column.id} className={`rounded-lg p-3 ${column.color}`}>
            <h3 className="font-medium text-sm mb-3 flex items-center justify-between">
              {column.label}
              <Badge variant="secondary" className="text-xs">
                {getApplicationsByStatus(column.id).length}
              </Badge>
            </h3>
            <div className="space-y-2">
              {getApplicationsByStatus(column.id).map(application => (
                <Card key={application.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {application.job_title || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {application.company || 'Unknown company'}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {application.job_url && (
                          <a
                            href={application.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-gray-100 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          onClick={() => openEditDialog(application)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(application.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                    {application.match_score !== null && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {application.match_score}% match
                        </Badge>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {STATUS_COLUMNS.filter(s => s.id !== column.id).map(status => (
                        <button
                          key={status.id}
                          onClick={() => handleStatusChange(application, status.id)}
                          className={`text-xs px-2 py-0.5 rounded ${status.color} hover:opacity-80`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { api, Profile, ExtractedProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface ProfilePageProps {
  profile: Profile | null;
  onUpdate: () => void;
  importedData?: ExtractedProfile | null;
  onImportComplete?: () => void;
}

export function ProfilePage({ profile, onUpdate, importedData, onImportComplete }: ProfilePageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    website: '',
    summary: '',
    branding_color: '#000000',
    branding_font: 'Inter',
    target_roles: [] as string[],
    values: [] as string[],
  });
  const [newRole, setNewRole] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        linkedin: profile.linkedin || '',
        website: profile.website || '',
        summary: profile.summary || '',
        branding_color: profile.branding_color || '#000000',
        branding_font: profile.branding_font || 'Inter',
        target_roles: profile.target_roles || [],
        values: profile.values || [],
      });
    }
  }, [profile]);

  useEffect(() => {
    if (importedData) {
      setFormData(prev => ({
        ...prev,
        name: importedData.name || prev.name,
        email: importedData.email || prev.email,
        phone: importedData.phone || prev.phone,
        location: importedData.location || prev.location,
        linkedin: importedData.linkedin || prev.linkedin,
        website: importedData.website || prev.website,
        summary: importedData.summary || prev.summary,
        target_roles: importedData.target_roles?.length ? importedData.target_roles : prev.target_roles,
      }));
      setMessage('Profile data imported from resume! Review and save your changes.');
      if (onImportComplete) {
        onImportComplete();
      }
    }
  }, [importedData, onImportComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    
    try {
      await api.profile.update(formData);
      setMessage('Profile updated successfully!');
      onUpdate();
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const addRole = () => {
    if (newRole.trim() && !formData.target_roles.includes(newRole.trim())) {
      setFormData({
        ...formData,
        target_roles: [...formData.target_roles, newRole.trim()],
      });
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    setFormData({
      ...formData,
      target_roles: formData.target_roles.filter(r => r !== role),
    });
  };

  const addValue = () => {
    if (newValue.trim() && !formData.values.includes(newValue.trim())) {
      setFormData({
        ...formData,
        values: [...formData.values, newValue.trim()],
      });
      setNewValue('');
    }
  };

  const removeValue = (value: string) => {
    setFormData({
      ...formData,
      values: formData.values.filter(v => v !== value),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Master Profile</CardTitle>
        <CardDescription>
          Your central profile data used to generate tailored resumes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div className={`p-3 text-sm rounded-md ${message.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="linkedin.com/in/johndoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="johndoe.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Professional Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="A brief summary of your professional background and goals..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Roles</Label>
            <div className="flex gap-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
              />
              <Button type="button" onClick={addRole} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.target_roles.map((role) => (
                <Badge key={role} variant="secondary" className="flex items-center gap-1">
                  {role}
                  <button type="button" onClick={() => removeRole(role)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Work Values</Label>
            <div className="flex gap-2">
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="e.g., Remote-first, Work-life balance"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
              />
              <Button type="button" onClick={addValue} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.values.map((value) => (
                <Badge key={value} variant="outline" className="flex items-center gap-1">
                  {value}
                  <button type="button" onClick={() => removeValue(value)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branding_color">Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="branding_color"
                  type="color"
                  value={formData.branding_color}
                  onChange={(e) => setFormData({ ...formData, branding_color: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={formData.branding_color}
                  onChange={(e) => setFormData({ ...formData, branding_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="branding_font">Brand Font</Label>
              <Input
                id="branding_font"
                value={formData.branding_font}
                onChange={(e) => setFormData({ ...formData, branding_font: e.target.value })}
                placeholder="Inter"
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

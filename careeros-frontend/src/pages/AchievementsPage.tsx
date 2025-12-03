import { useState } from 'react';
import { api, Achievement } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface AchievementsPageProps {
  achievements: Achievement[];
  onUpdate: () => void;
}

export function AchievementsPage({ achievements, onUpdate }: AchievementsPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [formData, setFormData] = useState({
    core_task: '',
    impact_metric: '',
    skills_used: [] as string[],
    tags: [] as string[],
    company: '',
    role: '',
    year: '',
    verification_level: 'Medium',
  });
  const [newSkill, setNewSkill] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      core_task: '',
      impact_metric: '',
      skills_used: [],
      tags: [],
      company: '',
      role: '',
      year: '',
      verification_level: 'Medium',
    });
    setEditingAchievement(null);
  };

  const openEditDialog = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      core_task: achievement.core_task,
      impact_metric: achievement.impact_metric || '',
      skills_used: achievement.skills_used || [],
      tags: achievement.tags || [],
      company: achievement.company || '',
      role: achievement.role || '',
      year: achievement.year?.toString() || '',
      verification_level: achievement.verification_level || 'Medium',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
      };

      if (editingAchievement) {
        await api.achievements.update(editingAchievement.id, data);
      } else {
        await api.achievements.create(data);
      }
      
      setIsDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Failed to save achievement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;
    
    try {
      await api.achievements.delete(id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete achievement:', error);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills_used.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills_used: [...formData.skills_used, newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills_used: formData.skills_used.filter(s => s !== skill),
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Achievements</h2>
          <p className="text-sm text-gray-500">Your evidence-based accomplishments with metrics</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Achievement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAchievement ? 'Edit Achievement' : 'Add Achievement'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="core_task">What did you do? *</Label>
                <Textarea
                  id="core_task"
                  value={formData.core_task}
                  onChange={(e) => setFormData({ ...formData, core_task: e.target.value })}
                  placeholder="Describe the core task or project you worked on..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="impact_metric">Impact Metric</Label>
                <Input
                  id="impact_metric"
                  value={formData.impact_metric}
                  onChange={(e) => setFormData({ ...formData, impact_metric: e.target.value })}
                  placeholder="e.g., Reduced latency by 40%, Increased revenue by $1M"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Your role"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verification_level">Verification Level</Label>
                  <select
                    id="verification_level"
                    value={formData.verification_level}
                    onChange={(e) => setFormData({ ...formData, verification_level: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skills Used</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="e.g., Python, React"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button type="button" onClick={addSkill} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills_used.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g., Performance, Backend"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
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

      {achievements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No achievements yet. Add your first one or use the AI Interviewer!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {achievements.map((achievement) => (
            <Card key={achievement.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{achievement.core_task}</p>
                    {achievement.impact_metric && (
                      <p className="text-sm text-green-600 font-medium mt-1">
                        {achievement.impact_metric}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {achievement.company && (
                        <Badge variant="outline">{achievement.company}</Badge>
                      )}
                      {achievement.role && (
                        <Badge variant="outline">{achievement.role}</Badge>
                      )}
                      {achievement.year && (
                        <Badge variant="outline">{achievement.year}</Badge>
                      )}
                    </div>
                    {achievement.skills_used && achievement.skills_used.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {achievement.skills_used.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(achievement)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(achievement.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

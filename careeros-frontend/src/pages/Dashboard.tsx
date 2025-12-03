import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, Profile, Achievement, Application, ExtractedProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfilePage } from './ProfilePage';
import { AchievementsPage } from './AchievementsPage';
import { InterviewerPage } from './InterviewerPage';
import { ATSSimulatorPage } from './ATSSimulatorPage';
import { TailorPage } from './TailorPage';
import { ApplicationsPage } from './ApplicationsPage';
import { User, Target, MessageSquare, FileText, Sparkles, Briefcase, LogOut } from 'lucide-react';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [importedProfileData, setImportedProfileData] = useState<ExtractedProfile | null>(null);

  const handleImportToProfile = (extractedData: ExtractedProfile) => {
    setImportedProfileData(extractedData);
    setActiveTab('profile');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, achievementsData, applicationsData] = await Promise.all([
        api.profile.get(),
        api.achievements.list(),
        api.applications.list(),
      ]);
      setProfile(profileData);
      setAchievements(achievementsData);
      setApplications(applicationsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const stats = {
    achievements: achievements.length,
    applications: applications.length,
    interviews: applications.filter(a => a.status === 'interview').length,
    offers: applications.filter(a => a.status === 'offer').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">CareerOS</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.achievements}</div>
              <p className="text-sm text-gray-500">Achievements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.applications}</div>
              <p className="text-sm text-gray-500">Applications</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.interviews}</div>
              <p className="text-sm text-gray-500">Interviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.offers}</div>
              <p className="text-sm text-gray-500">Offers</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Achievements</span>
            </TabsTrigger>
            <TabsTrigger value="interviewer" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Interviewer</span>
            </TabsTrigger>
            <TabsTrigger value="ats" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">ATS Check</span>
            </TabsTrigger>
            <TabsTrigger value="tailor" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Tailor</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Jobs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfilePage 
              profile={profile} 
              onUpdate={loadData} 
              importedData={importedProfileData}
              onImportComplete={() => setImportedProfileData(null)}
            />
          </TabsContent>
          <TabsContent value="achievements">
            <AchievementsPage achievements={achievements} onUpdate={loadData} />
          </TabsContent>
          <TabsContent value="interviewer">
            <InterviewerPage onAchievementAdded={loadData} />
          </TabsContent>
          <TabsContent value="ats">
            <ATSSimulatorPage onImportToProfile={handleImportToProfile} />
          </TabsContent>
          <TabsContent value="tailor">
            <TailorPage achievements={achievements} />
          </TabsContent>
          <TabsContent value="applications">
            <ApplicationsPage applications={applications} onUpdate={loadData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

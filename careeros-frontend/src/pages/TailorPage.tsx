import { useState } from 'react';
import { api, Achievement, TailorResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, CheckCircle, Lightbulb } from 'lucide-react';

interface TailorPageProps {
  achievements: Achievement[];
}

export function TailorPage({ achievements }: TailorPageProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<TailorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    if (achievements.length === 0) {
      setError('Please add some achievements first before tailoring your resume');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.tailor.analyze(jobDescription);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job description');
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Resume Tailor
          </CardTitle>
          <CardDescription>
            Paste a job description and I'll help you select the best achievements and tailor your resume
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
            {isLoading ? 'Analyzing...' : 'Analyze & Tailor'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Match Score</span>
                <span className={`text-3xl font-bold ${getMatchColor(result.match_score)}`}>
                  {result.match_score}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress 
                value={result.match_score} 
                className="h-3"
              />
              <p className="text-sm text-gray-500 mt-2">
                {result.match_score >= 80 
                  ? 'Great match! Your profile aligns well with this role.'
                  : result.match_score >= 60
                  ? 'Good potential. Consider highlighting more relevant experience.'
                  : 'Consider adding more relevant achievements to improve your match.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tailored Summary</CardTitle>
              <CardDescription>Use this summary for your resume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm">{result.tailored_summary}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(result.tailored_summary)}
              >
                Copy to Clipboard
              </Button>
            </CardContent>
          </Card>

          {result.selected_achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Recommended Achievements
                </CardTitle>
                <CardDescription>
                  These achievements are most relevant to this job
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.selected_achievements.map((selected) => {
                    const achievement = achievements.find(a => a.id === selected.id);
                    if (!achievement) return null;
                    
                    return (
                      <div key={selected.id} className="border rounded-lg p-4">
                        <p className="font-medium">{achievement.core_task}</p>
                        {achievement.impact_metric && (
                          <p className="text-sm text-green-600 mt-1">
                            {achievement.impact_metric}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {achievement.skills_used?.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2 italic">
                          Why: {selected.relevance_reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {result.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-500 mt-0.5">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

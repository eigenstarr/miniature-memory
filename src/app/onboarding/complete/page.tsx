import { completeOnboarding } from '@/actions/onboarding';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function CompletePage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
        <CardDescription>
          Your AP Quest Planner is ready to help you succeed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <h3 className="font-semibold">What&apos;s next?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">📋</span>
              <span>
                Create your first tasks and projects in the <strong>Quest Board</strong>
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⏱️</span>
              <span>
                Start your first study session in <strong>Focus Mode</strong>
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📊</span>
              <span>
                Track your progress in the <strong>Dashboard</strong>
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🎯</span>
              <span>
                Earn XP and unlock achievements as you study
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Pro tip:</strong> The planner will generate a personalized daily plan based on your deadlines, weak areas, and study goals. Check it every morning!
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <form action={completeOnboarding} className="w-full">
          <Button type="submit" className="w-full" size="lg">
            Go to Quest Board
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

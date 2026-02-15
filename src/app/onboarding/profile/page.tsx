import { updateProfile } from '@/actions/onboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProfilePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Profile</CardTitle>
        <CardDescription>
          Tell us a bit about yourself to personalize your experience
        </CardDescription>
      </CardHeader>
      <form action={updateProfile}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="Alex Johnson"
              required
            />
            <p className="text-xs text-muted-foreground">
              How you&apos;d like to be addressed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">Grade Level</Label>
            <Select name="grade" required>
              <SelectTrigger id="grade">
                <SelectValue placeholder="Select your grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9">9th Grade (Freshman)</SelectItem>
                <SelectItem value="10">10th Grade (Sophomore)</SelectItem>
                <SelectItem value="11">11th Grade (Junior)</SelectItem>
                <SelectItem value="12">12th Grade (Senior)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetStudyMinutesPerDay">
              Daily Study Goal (minutes)
            </Label>
            <Select
              name="targetStudyMinutesPerDay"
              defaultValue="120"
              required
            >
              <SelectTrigger id="targetStudyMinutesPerDay">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="150">2.5 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How much time you plan to study per day for AP prep
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            Continue to Course Selection
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

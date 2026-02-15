'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateDailyPlan } from '@/actions/planner';
import { useRouter } from 'next/navigation';

export function GeneratePlanButton() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateDailyPlan();
      if (result.success) {
        router.refresh(); // Reload the page to show the new plan
      } else {
        console.error('Failed to generate plan:', result.error);
        alert('Failed to generate plan. Please try again.');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating}
      size="lg"
      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Generating Plan...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Today&apos;s Plan
        </>
      )}
    </Button>
  );
}

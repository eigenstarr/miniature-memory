'use client';

import { useState } from 'react';
import { createUserCourses } from '@/actions/onboarding';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

const AP_COURSES = [
  { code: 'ap-calc-ab', name: 'AP Calculus AB' },
  { code: 'ap-bio', name: 'AP Biology' },
  { code: 'apush', name: 'AP U.S. History' },
  { code: 'ap-lang', name: 'AP English Language and Composition' },
];

interface SelectedCourse {
  code: string;
  name: string;
  examDate: string;
  targetScore: string;
}

export default function CoursesPage() {
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);

  const handleCourseToggle = (courseCode: string, courseName: string) => {
    if (selectedCourses.find((c) => c.code === courseCode)) {
      // Remove course
      setSelectedCourses(selectedCourses.filter((c) => c.code !== courseCode));
    } else {
      // Add course with default values
      setSelectedCourses([
        ...selectedCourses,
        {
          code: courseCode,
          name: courseName,
          examDate: '2026-05-15', // Default to May 15, 2026
          targetScore: '4',
        },
      ]);
    }
  };

  const updateCourseField = (
    courseCode: string,
    field: 'examDate' | 'targetScore',
    value: string
  ) => {
    setSelectedCourses(
      selectedCourses.map((c) =>
        c.code === courseCode ? { ...c, [field]: value } : c
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedCourses.length === 0) {
      alert('Please select at least one course');
      return;
    }

    const formData = new FormData();
    selectedCourses.forEach((course) => {
      formData.append(
        'courses',
        `${course.code}_${course.examDate}_${course.targetScore}`
      );
    });

    await createUserCourses(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Your AP Courses</CardTitle>
        <CardDescription>
          Choose the AP courses you&apos;re taking this year. We&apos;ll set up your study plan for each one.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {AP_COURSES.map((course) => {
            const isSelected = selectedCourses.find(
              (c) => c.code === course.code
            );
            return (
              <div
                key={course.code}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={course.code}
                    checked={!!isSelected}
                    onCheckedChange={() =>
                      handleCourseToggle(course.code, course.name)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={course.code}
                      className="text-base font-semibold cursor-pointer"
                    >
                      {course.name}
                    </Label>
                  </div>
                </div>

                {isSelected && (
                  <div className="ml-7 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${course.code}-exam-date`}>
                        Exam Date
                      </Label>
                      <Input
                        id={`${course.code}-exam-date`}
                        type="date"
                        value={isSelected.examDate}
                        onChange={(e) =>
                          updateCourseField(
                            course.code,
                            'examDate',
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${course.code}-target-score`}>
                        Target Score
                      </Label>
                      <Select
                        value={isSelected.targetScore}
                        onValueChange={(value) =>
                          updateCourseField(course.code, 'targetScore', value)
                        }
                        required
                      >
                        <SelectTrigger id={`${course.code}-target-score`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 - Qualified</SelectItem>
                          <SelectItem value="4">4 - Well Qualified</SelectItem>
                          <SelectItem value="5">
                            5 - Extremely Well Qualified
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {selectedCourses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Select at least one course to continue
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button type="submit" disabled={selectedCourses.length === 0}>
            Continue ({selectedCourses.length} course
            {selectedCourses.length !== 1 ? 's' : ''} selected)
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

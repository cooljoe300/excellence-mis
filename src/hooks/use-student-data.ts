'use client';

import { useState, useEffect } from 'react';
import type { Student } from '@/lib/types';

interface StudentDataResult {
  student: Student | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStudentData(): StudentDataResult {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/student/me');
      
      if (!response.ok) {
        throw new Error('Failed to fetch student data');
      }
      
      const data = await response.json();
      setStudent(data.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, []);

  return {
    student,
    loading,
    error,
    refetch: fetchStudent,
  };
}

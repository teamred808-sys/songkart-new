const fs = require('fs');

const content = `import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiFetch } from '@/lib/api';

export function useDisplayNameAvailability(name: string, excludeUserId?: string) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const debouncedName = useDebounce(name.trim(), 400);

  useEffect(() => {
    if (!debouncedName || debouncedName.length < 2) {
      setIsAvailable(null);
      setIsChecking(false);
      return;
    }

    const checkAvailability = async () => {
      setIsChecking(true);
      try {
        const data = await apiFetch('/auth/check-name', { 
          method: 'POST', 
          body: JSON.stringify({ name: debouncedName, exclude_user_id: excludeUserId }) 
        }).catch(() => null);
        
        setIsAvailable(data as boolean);
      } catch (error) {
        console.error('Error checkconst fs = require('fs');

con      setIsAvailable(null);
 import { useDebounce } from '@/hooks/useDebounce';
import { ;
import { apiFetch } from '@/lib/api';

export funcl
export function useDisplayNameAvail, i  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [lu  const [isChecking, setIsChecking] = useState(false);
  const debouncap  const debouncedName = useDebounce(name.trim(), 400)  
  useEffect(() => {
    if (!debouncedName || debounlud    if (!debounced;
      setIsAvailable(null);
      setIsChecking(falsrn      setIsChecking(false)Fi      return;
    }

    cay    }

    c',
   ten      setIsChecking(true);
      try {
   ui   

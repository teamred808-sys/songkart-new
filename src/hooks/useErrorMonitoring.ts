import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { AdminSection, ErrorType } from '@/lib/adminConstants';
import { apiFetch } from '@/lib/api';

interface ErrorContext {
  module: AdminSection;
  action?: string;
  context?: Record<string, unknown>;
}

function getBrowserInfo(): Record<string, unknown> {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    url: window.location.href,
  };
}

function getErrorType(error: unknown): ErrorType {
  if (error instanceof TypeError) return 'network_error';
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('permission') || message.includes('rls') || message.includes('policy')) {
      return 'permission_error';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network_error';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation_error';
    }
  }
  return 'api_error';
}

function getSeverity(error: unknown): 'warning' | 'error' | 'critical' {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('critical') || message.includes('fatal')) return 'critical';
    if (message.includes('warning')) return 'warning';
  }
  return 'error';
}

function contextToJson(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};
  return JSON.parse(JSON.stringify(context));
}

export function useErrorMonitoring() {
  const { user } = useAuth();

  const logError = useCallback(
    async (error: unknown, context: ErrorContext): Promise<void> => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      try {
        await apiFetch('/system_error_logs', {
          method: 'POST',
          body: JSON.stringify([{
            error_type: getErrorType(error),
            error_message: errorMessage,
            error_stack: errorStack,
            module: context.module,
            action_performed: context.action,
            user_id: user?.id,
            severity: getSeverity(error),
            context: context.context,
            browser_info: getBrowserInfo(),
          }]),
        }).catch((insertError) => {
          console.error('Failed to log error to system_error_logs:', insertError);
        });
      } catch (logError) {
        console.error('Error logging failed:', logError);
      }
    },
    [user?.id]
  );

  const handleError = useCallback(
    async (error: unknown, context: ErrorContext, userMessage?: string): Promise<void> => {
      // Always show toast to prevent silent failures
      toast({
        title: userMessage || 'An error occurred',
        description: error instanceof Error ? error.message : 'Please try again or report this issue.',
        variant: 'destructive',
      });

      // Log the error
      await logError(error, context);
    },
    [logError]
  );

  const wrapMutation = useCallback(
    <T extends (...args: unknown[]) => Promise<unknown>>(
      mutationFn: T,
      context: ErrorContext,
      userMessage?: string
    ) => {
      return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        try {
          return (await mutationFn(...args)) as ReturnType<T>;
        } catch (error) {
          await handleError(error, context, userMessage);
          throw error;
        }
      };
    },
    [handleError]
  );

  return { logError, handleError, wrapMutation };
}

// Standalone function for use outside of React components
export async function logSystemError(
  error: unknown,
  context: { module: AdminSection; action?: string; userId?: string; context?: Record<string, unknown> }
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  try {
    const insertError = await apiFetch('/system_error_logs', {
      method: 'POST',
      body: JSON.stringify([{
        error_type: getErrorType(error),
        error_message: errorMessage,
        error_stack: errorStack,
        module: context.module,
        action_performed: context.action,
        user_id: context.userId,
        severity: getSeverity(error),
        context: context.context,
        browser_info: getBrowserInfo(),
      }]),
    }).then(() => null).catch((e) => e);

    if (insertError) {
      console.error('Failed to log error:', insertError);
    }
  } catch (logError) {
    console.error('Error logging failed:', logError);
  }
}

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { logSystemError } from '@/hooks/useErrorMonitoring';

interface Props {
  children: ReactNode;
  module?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log the error to the system
    logSystemError(error, {
      module: (this.props.module || 'general') as 'general',
      action: 'render_error',
      context: {
        componentStack: errorInfo.componentStack,
        url: window.location.href,
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReportBug = () => {
    // Open bug report modal - we'll use a custom event for this
    window.dispatchEvent(new CustomEvent('open-bug-report', {
      detail: {
        title: `Render Error: ${this.state.error?.message || 'Unknown error'}`,
        description: `A render error occurred:\n\n${this.state.error?.stack || ''}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ''}`,
        section: this.props.module || 'general',
        severity: 'high',
      },
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="max-w-lg w-full border-destructive/30 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-destructive">Something went wrong</CardTitle>
                  <CardDescription>
                    An error occurred while rendering this section
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted rounded-lg font-mono text-sm overflow-auto max-h-32">
                {this.state.error?.message || 'Unknown error'}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReportBug} variant="outline">
                <Bug className="h-4 w-4 mr-2" />
                Report Bug
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

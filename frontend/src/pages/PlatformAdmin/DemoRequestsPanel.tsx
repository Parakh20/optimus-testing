import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { platformFetch } from './platformFetch';

/**
 * Inbound demo requests from the marketing site's contact form.
 *
 * These rows previously had no read surface anywhere in the codebase — the only
 * path from a submitted form to a human was a Resend email, so a send failure
 * (missing API key, a 502, or the function's own 30/hr rate limit) lost the lead
 * silently while the visitor was still shown "Request received". This panel is
 * the durable record; the email is now only a convenience notification on top of
 * it.
 *
 * `linked_lead_id` marks requests whose email already appears on a lead, so the
 * unmarked ones are the follow-up queue.
 */

interface DemoRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company: string;
  phone: string | null;
  message: string | null;
  source: string | null;
  linked_lead_id: string | null;
}

export function DemoRequestsPanel() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await platformFetch('get_demo_requests')) as { requests?: DemoRequest[] };
        if (!cancelled) setRequests(data.requests ?? []);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: 'Could not load demo requests',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading demo requests…
      </div>
    );
  }

  if (requests.length === 0) return null;

  const unworked = requests.filter(r => !r.linked_lead_id).length;

  return (
    <div className="rounded-lg border">
      <Button
        variant="ghost"
        onClick={() => setOpen(v => !v)}
        className="w-full justify-start gap-2 px-4 py-3 h-auto font-medium"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Inbox className="h-4 w-4" />
        Demo requests
        <Badge variant="secondary" className="ml-1">{requests.length}</Badge>
        {unworked > 0 && (
          <Badge variant="destructive" className="ml-1">{unworked} not in pipeline</Badge>
        )}
      </Button>

      {open && (
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Received</TableHead>
                <TableHead scope="col">Company</TableHead>
                <TableHead scope="col">Contact</TableHead>
                <TableHead scope="col">Message</TableHead>
                <TableHead scope="col">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{r.company}</TableCell>
                  <TableCell className="text-sm">
                    <div>{r.name}</div>
                    <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email}</a>
                    {r.phone && <div className="text-muted-foreground">{r.phone}</div>}
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-muted-foreground whitespace-pre-line">
                    {r.message ?? '—'}
                  </TableCell>
                  <TableCell>
                    {r.linked_lead_id ? (
                      <Badge variant="outline">In pipeline</Badge>
                    ) : (
                      <Badge variant="destructive">Not worked</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AZEvolutionPanel from '@/components/AZEvolutionPanel';

/** Approval entry beside the composer; clicking only opens the existing review. */
export default function AZApprovalNotice() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const previews = trpc.unifiedTools.listCodePreviews.useQuery({
    accountId: String(user?.id ?? ""), includeHistory: true,
  }, {
    enabled: user?.role === 'admin',
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const count = previews.data?.filter(preview =>
    preview.status === 'pending' && preview.expiresInSeconds > 0).length ?? 0;

  if (user?.role !== 'admin') return null;
  return <>
    {count > 0 && <Button type="button" variant="outline"
      className="h-10 shrink-0 gap-1.5 rounded-lg border-amber-400 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
      aria-label={"承認待ち" + count + "件。変更案を確認"}
      aria-haspopup="dialog"
      title="変更案を確認して承認"
      onClick={() => setOpen(true)}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />
      <span aria-live="polite" aria-atomic="true">承認 <span className="tabular-nums">{count}</span></span>
    </Button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>変更案の確認・承認</DialogTitle>
          <DialogDescription>
            内容を確認して承認すると、ファイルの作成・変更とGitコミットを行います。
          </DialogDescription>
        </DialogHeader>
        <AZEvolutionPanel reviewOnly />
      </DialogContent>
    </Dialog>
  </>;
}

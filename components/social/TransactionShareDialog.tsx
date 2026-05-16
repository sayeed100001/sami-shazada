'use client'

import { useState } from 'react'
import { Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface TransactionShareDialogProps {
  transactionId: string
  defaultTitle: string
}

export function TransactionShareDialog({ transactionId, defaultTitle }: TransactionShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [title, setTitle] = useState(defaultTitle)
  const [note, setNote] = useState('')
  const [allowAmounts, setAllowAmounts] = useState(false)
  const [allowParticipants, setAllowParticipants] = useState(false)
  const [allowSaraf, setAllowSaraf] = useState(true)

  const createShare = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/transaction-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          title,
          note,
          allowAmounts,
          allowParticipants,
          allowSaraf,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to create share link')
      }

      const absoluteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${data.share.shareUrl}`
        : data.share.shareUrl

      setGeneratedUrl(absoluteUrl)
      await navigator.clipboard.writeText(absoluteUrl)
      toast.success('Share link created and copied.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create share link.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create public share link</DialogTitle>
          <DialogDescription>
            Control how much information is visible before publishing a transaction update.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-title">Share title</Label>
            <Input id="share-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-note">Note</Label>
            <Textarea
              id="share-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a short context for this public update."
              rows={3}
            />
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Show amounts and rates</p>
                <p className="text-sm text-muted-foreground">Expose currencies, amounts, and exchange rate.</p>
              </div>
              <Switch checked={allowAmounts} onCheckedChange={setAllowAmounts} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Show participant names</p>
                <p className="text-sm text-muted-foreground">If disabled, participant names are masked.</p>
              </div>
              <Switch checked={allowParticipants} onCheckedChange={setAllowParticipants} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Show saraf details</p>
                <p className="text-sm text-muted-foreground">Include the saraf name and contact info.</p>
              </div>
              <Switch checked={allowSaraf} onCheckedChange={setAllowSaraf} />
            </div>
          </div>

          {generatedUrl ? (
            <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
              <Label htmlFor="generated-share">Public link</Label>
              <div className="flex gap-2">
                <Input id="generated-share" readOnly value={generatedUrl} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedUrl)
                    toast.success('Share link copied.')
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={createShare} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

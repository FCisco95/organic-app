'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/context';
import { useCreateIdea } from '@/features/ideas';
import toast from 'react-hot-toast';

const TITLE_MAX = 200;
const BODY_MAX = 10000;

export function IdeaComposerDialog() {
  const t = useTranslations('Ideas');
  const { user, profile, loading } = useAuth();
  const canCreate = Boolean(profile?.organic_id);
  const createIdea = useCreateIdea();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      toast.error(t('organicRequired'));
      return;
    }

    try {
      await createIdea.mutateAsync({ title, body });
      setTitle('');
      setBody('');
      setOpen(false);
      toast.success(t('ideaCreated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('ideaCreateError');
      toast.error(message);
    }
  }

  // Unauthenticated state: show sign-in prompt inside dialog
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="cta">
            <Plus className="h-4 w-4" />
            {t('composerTitle')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('composerTitle')}</DialogTitle>
            <DialogDescription>{t('signinPrompt')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg bg-cta px-4 py-2 text-sm font-semibold text-cta-fg hover:bg-cta-hover"
            >
              {t('signIn')}
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="cta">
          <Plus className="h-4 w-4" />
          {t('composerTitle')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('composerTitle')}</DialogTitle>
          <DialogDescription>{t('composerSubtitle')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t('organicRequired')}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('composerTitlePlaceholder')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
                maxLength={TITLE_MAX}
              />
            </div>
            <div className="relative">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('composerBodyPlaceholder')}
                className="h-40 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
                maxLength={BODY_MAX}
              />
              <span className="absolute bottom-2 right-3 font-mono text-[10px] text-muted-foreground">
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <Button
              type="submit"
              disabled={createIdea.isPending || title.trim().length < 5 || body.trim().length < 20}
              className="w-full disabled:opacity-60"
              variant="cta"
            >
              <Plus className="h-4 w-4" />
              {createIdea.isPending ? t('publishing') : t('publish')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Mobile FAB trigger for the composer dialog */
export function IdeaComposerFab() {
  const t = useTranslations('Ideas');
  const [open, setOpen] = useState(false);
  const { user, profile, loading } = useAuth();
  const canCreate = Boolean(profile?.organic_id);
  const createIdea = useCreateIdea();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) {
      toast.error(t('organicRequired'));
      return;
    }
    try {
      await createIdea.mutateAsync({ title, body });
      setTitle('');
      setBody('');
      setOpen(false);
      toast.success(t('ideaCreated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('ideaCreateError');
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-cta text-cta-fg shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-cta-hover md:hidden"
          aria-label={t('composerTitle')}
        >
          <Plus className="h-6 w-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('composerTitle')}</DialogTitle>
          <DialogDescription>{t('composerSubtitle')}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !user ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{t('signinPrompt')}</p>
            <Link
              href="/login"
              className="mt-2 inline-block font-semibold text-organic-terracotta"
            >
              {t('signIn')}
            </Link>
          </div>
        ) : !canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t('organicRequired')}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('composerTitlePlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
              maxLength={TITLE_MAX}
            />
            <div className="relative">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('composerBodyPlaceholder')}
                className="h-40 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-organic-terracotta/30"
                maxLength={BODY_MAX}
              />
              <span className="absolute bottom-2 right-3 font-mono text-[10px] text-muted-foreground">
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <Button
              type="submit"
              disabled={createIdea.isPending || title.trim().length < 5 || body.trim().length < 20}
              className="w-full disabled:opacity-60"
              variant="cta"
            >
              <Plus className="h-4 w-4" />
              {createIdea.isPending ? t('publishing') : t('publish')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
